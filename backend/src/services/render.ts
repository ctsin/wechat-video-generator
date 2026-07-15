// Render dispatcher.
//
// Two paths:
//   * AWS Lambda (REMOTION_LAMBDA_ENABLED=1 + bucket + function): resolve
//     @remotion/lambda from the frontend package, deploy the composition site
//     once per process (or reuse REMOTION_SERVE_URL), submit
//     renderMediaOnLambda, poll progress, then hand the S3 public URL of the
//     finished MP4 back to the client. No local download, no shared disk.
//   * Dev/local mode: render the composition on this machine via
//     @remotion/renderer into static/renders/<jobId>.mp4 — a real, playable
//     MP4 with no AWS required; served via the /static/renders mount.

import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, remotionLambdaReady } from '../lib/env.js';
import {
  publicUrlFor,
  updateJob,
  type RenderJob,
} from './jobs.js';
import type { DialogueScript } from '../types/script.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERS_DIR = path.resolve(__dirname, '../../static/renders');
// The Remotion composition + its render toolchain live in the frontend
// package. We resolve @remotion/bundler and @remotion/renderer from there
// (via a require rooted in frontend/) so their versions always match the
// `remotion` version the composition is built against — no second install.
const FRONTEND_DIR = path.resolve(__dirname, '../../../frontend');
const REMOTION_ENTRY = path.join(FRONTEND_DIR, 'src/remotion/index.ts');
const COMPOSITION_ID = 'WeChatChat';

async function ensureRendersDir(): Promise<void> {
  await fs.mkdir(RENDERS_DIR, { recursive: true });
}

// Resolve the Remotion render toolchain from the frontend package so the
// bundler/renderer versions line up with the composition's `remotion`.
const requireFromFrontend = createRequire(path.join(FRONTEND_DIR, 'noop.js'));

// Bundling the composition takes a few seconds; do it once per process and
// share the resulting serveUrl across every local render job.
let bundlePromise: Promise<string> | null = null;
function getServeUrl(): Promise<string> {
  if (!bundlePromise) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { bundle }: any = requireFromFrontend('@remotion/bundler');
    const pending: Promise<string> = bundle({ entryPoint: REMOTION_ENTRY }).catch(
      (err: unknown) => {
        // Reset so a later job can retry a failed bundle.
        if (bundlePromise === pending) bundlePromise = null;
        throw err;
      },
    );
    bundlePromise = pending;
  }
  return bundlePromise;
}

// Dev/local path: render the WeChatChat composition on this machine via
// @remotion/renderer (headless Chromium + the native compositor), writing a
// real, playable H.264 MP4 into static/renders/<jobId>.mp4.
async function renderLocally(
  job: RenderJob,
  script: DialogueScript,
): Promise<void> {
  await ensureRendersDir();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { selectComposition, renderMedia }: any =
    requireFromFrontend('@remotion/renderer');

  updateJob(job.id, { status: 'rendering', progress: 0.05, compositionId: COMPOSITION_ID });

  const serveUrl = await getServeUrl();
  const inputProps = { script };
  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps,
  });

  updateJob(job.id, { progress: 0.1 });

  await renderMedia({
    serveUrl,
    composition,
    codec: 'h264',
    inputProps,
    outputLocation: path.join(RENDERS_DIR, `${job.id}.mp4`),
    onProgress: ({ progress }: { progress: number }) => {
      // renderMedia reports 0..1 over encode; map into the 0.1..1 band.
      updateJob(job.id, { progress: 0.1 + progress * 0.9 });
    },
  });
}

// Deploying the composition site to S3 is slow + costs a PUT storm; do it once
// per process (or skip entirely when the operator pins REMOTION_SERVE_URL to an
// already-deployed site) and share the serveUrl across every Lambda job.
let lambdaServeUrlPromise: Promise<string> | null = null;
function getLambdaServeUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lambda: any,
  region: string,
  bucketName: string,
): Promise<string> {
  if (env.REMOTION_SERVE_URL) return Promise.resolve(env.REMOTION_SERVE_URL);
  if (!lambdaServeUrlPromise) {
    const pending: Promise<string> = lambda
      .deploySite({
        bucketName,
        region,
        entryPoint: REMOTION_ENTRY,
        siteName: env.REMOTION_SITE_NAME,
      })
      .then((r: { serveUrl: string }) => r.serveUrl)
      .catch((err: unknown) => {
        // Reset so a later job can retry a failed deploy.
        if (lambdaServeUrlPromise === pending) lambdaServeUrlPromise = null;
        throw err;
      });
    lambdaServeUrlPromise = pending;
  }
  return lambdaServeUrlPromise;
}

// Production path: render the WeChatChat composition on AWS Lambda. The
// finished MP4 lives in S3 (the deploySite bucket, with privacy:'public-acl'
// or the Lambda's default public read) and we hand the S3 URL straight to the
// client — no local download, no shared disk, no per-instance state.
async function renderOnLambda(
  job: RenderJob,
  script: DialogueScript,
): Promise<void> {
  // Resolve from the frontend package (same as the local renderer) so the
  // @remotion/lambda version matches the composition's `remotion` — the
  // backend does not install @remotion/* itself.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lambda: any = requireFromFrontend('@remotion/lambda');
  const region = env.REMOTION_AWS_REGION;
  const bucketName = env.REMOTION_BUCKET_NAME!;
  const functionName = env.REMOTION_FUNCTION_NAME!;

  updateJob(job.id, {
    status: 'rendering',
    progress: 0.03,
    compositionId: COMPOSITION_ID,
  });

  const serveUrl = await getLambdaServeUrl(lambda, region, bucketName);

  updateJob(job.id, { progress: 0.05 });

  const { renderId } = await lambda.renderMediaOnLambda({
    region,
    bucketName,
    functionName,
    serveUrl,
    composition: COMPOSITION_ID,
    inputProps: { script },
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 1,
    framesPerLambda: 90,
  });

  updateJob(job.id, { remoteRenderId: renderId, progress: 0.1 });

  // The final progress object carries the public S3 URL of the rendered MP4
  // (p.outputFile / p.postRenderData.outputFile). Capture it instead of
  // streaming the file down through the backend.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalProgress: any = null;
  for (;;) {
    const p = await lambda.getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region,
      skipLambdaInvocation: true,
    });
    finalProgress = p;
    const total = p.renderMetadata?.totalFrames ?? 0;
    const done = p.framesRendered ?? 0;
    const ratio = total > 0 ? Math.min(0.95, 0.1 + (done / total) * 0.85) : 0.5;
    updateJob(job.id, { progress: ratio });
    if (p.renderStatus === 'done' || p.postRenderData?.outputFile) break;
    if (p.errors?.some?.((e: { isFatal?: boolean }) => e.isFatal)) {
      throw new Error(`lambda render fatal: ${JSON.stringify(p.errors)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  const outputFile =
    finalProgress?.outputFile ?? finalProgress?.postRenderData?.outputFile;
  if (!outputFile) {
    throw new Error(
      `lambda render finished but no outputFile was reported (renderId=${renderId})`,
    );
  }

  updateJob(job.id, {
    status: 'done',
    progress: 1,
    outputUrl: outputFile,
  });
}

// Kick off a render job asynchronously. Resolves when queued; full status
// is observed via getJob(). Caller (the route) just returns the new job id.
export function startRender(
  job: RenderJob,
  script: DialogueScript,
): void {
  // Detach from the request lifecycle.
  void (async () => {
    try {
      if (remotionLambdaReady) {
        await renderOnLambda(job, script);
      } else {
        // Dev/local path: really render on this machine so the download is a
        // playable MP4 (no AWS required).
        await renderLocally(job, script);
        updateJob(job.id, {
          status: 'done',
          progress: 1,
          outputUrl: publicUrlFor(job.id),
        });
      }
    } catch (err) {
      console.error('[render] job failed:', job.id, err);
      updateJob(job.id, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}

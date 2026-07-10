// Render dispatcher.
//
// Two paths:
//   * AWS Lambda (REMOTION_LAMBDA_ENABLED=1 + bucket + function): we
//     dynamically import @remotion/lambda, deploySite the frontend
//     composition once per session, then call renderMediaOnLambda and
//     poll until done.
//   * Dev mode: we synthesize a tiny placeholder MP4 into
//     <repo>/backend/static/renders/<jobId>.mp4 so the front-end can
//     observe the full flow (status polling, download URL) without AWS
//     credentials.
//
// The output MP4 stream is exposed at /static/renders/<id>.mp4 either way.

import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, remotionLambdaReady } from '../lib/env.js';
import {
  getJob,
  publicUrlFor,
  updateJob,
  type RenderJob,
} from './jobs.js';
import type { DialogueScript } from '../types/script.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERS_DIR = path.resolve(__dirname, '../../static/renders');

// Minimal valid MP4 (ftyp + mdat boxes only). 80 bytes.
// Enough to be a downloadable resource; not a playable video. The
// dev-mode output is purely so the front-end can verify the contract.
const PLACEHOLDER_MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
  0x00, 0x00, 0x00, 0x00, 0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x10, 0x6d, 0x64, 0x61, 0x74,
]);

async function ensureRendersDir(): Promise<void> {
  await fs.mkdir(RENDERS_DIR, { recursive: true });
}

async function writePlaceholder(jobId: string): Promise<void> {
  await ensureRendersDir();
  await fs.writeFile(path.join(RENDERS_DIR, `${jobId}.mp4`), PLACEHOLDER_MP4);
}

// Dynamic imports so we don't pull @remotion/lambda into the bundle when the
// dev backend runs without AWS.
async function renderOnLambda(
  job: RenderJob,
  script: DialogueScript,
  scriptId: string,
): Promise<void> {
  // The package may not be installed in dev — the dynamic import only runs
  // when REMOTION_LAMBDA_ENABLED=1 + bucket + function are all configured.
  // @ts-ignore -- optional dep
  const lambda: any = await import('@remotion/lambda');
  const region = env.REMOTION_AWS_REGION;
  const bucketName = env.REMOTION_BUCKET_NAME!;
  const functionName = env.REMOTION_FUNCTION_NAME!;

  const { serveUrl } = await lambda.deploySite({
    bucketName,
    region,
    entryPoint: path.resolve(__dirname, '../../../frontend/src/remotion/index.ts'),
    siteName: `wechat-${scriptId}`,
  });

  updateJob(job.id, {
    status: 'rendering',
    progress: 0.05,
    compositionId: 'WeChatChat',
  });

  const { renderId } = await lambda.renderMediaOnLambda({
    region,
    bucketName,
    functionName,
    serveUrl,
    composition: 'WeChatChat',
    inputProps: { script },
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 1,
    framesPerLambda: 90,
  });

  updateJob(job.id, { remoteRenderId: renderId, progress: 0.1 });

  for (;;) {
    const p = await lambda.getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region,
      skipLambdaInvocation: true,
    });
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

  const stream = await lambda.downloadMedia({ renderId, bucketName, region });
  await ensureRendersDir();
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(path.join(RENDERS_DIR, `${job.id}.mp4`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (stream as any).pipe(out).on('finish', () => resolve()).on('error', reject);
  });

  updateJob(job.id, {
    status: 'done',
    progress: 1,
    outputUrl: publicUrlFor(job.id),
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
        await renderOnLambda(job, script, job.id);
      } else {
        // Dev path: simulate progress + write a placeholder MP4 so /static serves it.
        for (let step = 1; step <= 5; step++) {
          await new Promise((r) => setTimeout(r, 250));
          const fresh = getJob(job.id);
          if (!fresh) return;
          updateJob(job.id, { status: 'rendering', progress: step / 6 });
        }
        await writePlaceholder(job.id);
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

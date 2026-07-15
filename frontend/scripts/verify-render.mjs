// AWS Remotion Lambda render-end-to-end verification.
//
// Goals:
//   1. Reuse the existing S3 bucket + Lambda function (already deployed).
//   2. Bundle the current WeChatChat composition (frontend/src/remotion/index.ts).
//   3. Upload the bundle.
//   4. Submit a short renderMediaOnLambda job (~3 seconds @ 30fps).
//   5. Poll progress to completion.
//   6. Download out.mp4 to /tmp/aws-verify-out.mp4.
//
// This file is NOT imported by the Vite frontend. Run via:
//   cd frontend && npm run verify:render

import {
  getOrCreateBucket,
  deployFunction,
  getFunctions,
  getRenderProgress,
  renderMediaOnLambda,
  deploySite,
  downloadMedia,
} from '@remotion/lambda';

const REGION = process.env.REMOTION_AWS_REGION ?? 'us-east-1';
const SITE_NAME = 'wechat-verify';
const ENTRY = 'src/remotion/index.ts'; // resolved relative to cwd
const OUT = '/tmp/aws-verify-out.mp4';

function log(...args) {
  console.log('[verify-render]', ...args);
}

async function main() {
  log(`region = ${REGION}`);

  // 1) Bucket: deployBucket returns the existing bucket if it's already there.
  log('deployBucket...');
  const { bucketName } = await getOrCreateBucket({
    region: REGION,
  });
  log(`bucket = ${bucketName}`);

  // 2) Function: reuse a version-compatible one if present, else deploy one.
  //    compatibleOnly:true filters to functions matching the installed
  //    @remotion version, so we don't hardcode a stale version string.
  log('checking existing functions...');
  const funcs = await getFunctions({ region: REGION, compatibleOnly: true });

  let functionName;
  if (funcs.length > 0) {
    functionName = funcs[0].functionName;
    log(`reusing existing function: ${functionName}`);
  } else {
    log('deploying fresh function...');
    const fn = await deployFunction({
      region: REGION,
      timeoutInSeconds: 120,
      memorySizeInMb: 2048,
      diskSizeInMb: 2048,
      createCloudWatchLogs: true,
      architecture: 'x86_64',
    });
    functionName = fn.functionName;
    log(`deployed function: ${functionName}`);
  }

  // 3+4) deploySite bundles + uploads in one call (internally calls @remotion/bundler).
  log('deploySite (bundle + upload)...');
  const { serveUrl } = await deploySite({
    bucketName,
    region: REGION,
    entryPoint: ENTRY,
    siteName: SITE_NAME,
  });
  log(`serveUrl = ${serveUrl}`);

  // 5) Render. Use a short, free-tier-safe composition: 90 frames @ 30fps = 3s.
  //    Composition id === WeChatChat's component name (registerRoot registers it as the root).
  log('renderMediaOnLambda...');
  const { renderId } = await renderMediaOnLambda({
    region: REGION,
    bucketName,
    functionName,
    serveUrl,
    composition: 'WeChatChat',
    inputProps: {
      script: {
        width: 720,
        height: 1280,
        fps: 30,
        phoneModel: 'standard',
        timeline: [
          { id: 'v1', type: 'text', sender: 'target', content: '你好', durationInFrames: 60 },
          { id: 'v2', type: 'text', sender: 'me',     content: '在吗', durationInFrames: 30 },
        ],
      },
    },
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 1,
    framesPerLambda: 90,
    logLevel: 'info',
  });
  log(`renderId = ${renderId}`);

  // 6) Poll. getRenderProgress requires functionName and skipLambdaInvocation=true
  // so we read progress.json from S3 instead of invoking the Lambda again
  // on every poll (which would burn extra $$).
  log('polling progress...');
  for (;;) {
    const p = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region: REGION,
      skipLambdaInvocation: true,
    });
    log(
      `  frames=${p.framesRendered ?? '?'}/${p.renderMetadata?.totalFrames ?? '?'}  status=${p.renderStatus ?? JSON.stringify(p)}`,
    );
    if (p.renderStatus === 'done' || p.postRenderData?.outputFile) break;
    if (
      p.errors?.some?.((e) => e.isFatal) ||
      p.fatalErrorTimestamp
    ) {
      throw new Error(`Render reported errors: ${JSON.stringify(p.errors)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  // 7) Download. downloadMedia (Remotion 4.x) writes to outPath and resolves
  //    to { outputPath, sizeInBytes } — it is not a stream.
  log(`downloading to ${OUT}...`);
  const { outputPath, sizeInBytes } = await downloadMedia({
    renderId,
    bucketName,
    region: REGION,
    outPath: OUT,
  });

  log(`✔ done -> ${outputPath} (${sizeInBytes} bytes)`);
  log('inspect with:');
  log(`  ls -la ${outputPath}`);
  log(`  ffprobe ${outputPath}      # if ffmpeg is installed`);
  log('');
  log('Put these in backend/.env to enable the production render path:');
  log('  REMOTION_LAMBDA_ENABLED=1');
  log(`  REMOTION_AWS_REGION=${REGION}`);
  log(`  REMOTION_BUCKET_NAME=${bucketName}`);
  log(`  REMOTION_FUNCTION_NAME=${functionName}`);
}

main().catch((err) => {
  console.error('[verify-render] FAILED:', err);
  process.exit(1);
});

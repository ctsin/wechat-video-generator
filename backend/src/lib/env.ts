import { z } from 'zod';

// Read env once. Throws clearly if any required value is malformed.
const Schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
  JWT_SECRET: z.string().min(8).default('dev-secret-please-change-me'),
  REMOTION_LAMBDA_ENABLED: z
    .enum(['1', 'true', 'yes', ''])
    .optional()
    .transform((v) => v === '1' || v === 'true' || v === 'yes'),
  REMOTION_AWS_REGION: z.string().default('us-east-1'),
  REMOTION_BUCKET_NAME: z.string().optional(),
  REMOTION_FUNCTION_NAME: z.string().optional(),
  // AWS credentials Remotion Lambda reads from the environment. Kept in the
  // schema for visibility; the @remotion/lambda SDK reads process.env directly.
  REMOTION_AWS_ACCESS_KEY_ID: z.string().optional(),
  REMOTION_AWS_SECRET_ACCESS_KEY: z.string().optional(),
  // Skip per-process deploySite by pointing at an already-deployed site.
  REMOTION_SERVE_URL: z.string().url().optional(),
  // Site name used when the backend deploys the composition itself.
  REMOTION_SITE_NAME: z.string().default('wechat-video'),
  MAX_BGM_BYTES: z.coerce.number().int().positive().default(20 * 1024 * 1024),
});

export const env = Schema.parse(process.env);

// True when the operator has configured enough to dispatch real Lambda jobs.
export const remotionLambdaReady =
  env.REMOTION_LAMBDA_ENABLED &&
  Boolean(env.REMOTION_BUCKET_NAME) &&
  Boolean(env.REMOTION_FUNCTION_NAME);

// Warn early (rather than fail mid-render) when Lambda is enabled but AWS
// credentials are not present in the environment or a shared AWS config.
if (
  remotionLambdaReady &&
  !env.REMOTION_AWS_ACCESS_KEY_ID &&
  !process.env.AWS_ACCESS_KEY_ID &&
  !process.env.AWS_PROFILE
) {
  console.warn(
    '[env] REMOTION_LAMBDA_ENABLED is set but no AWS credentials found ' +
      '(REMOTION_AWS_ACCESS_KEY_ID / AWS_ACCESS_KEY_ID / AWS_PROFILE). ' +
      'Lambda renders will fail until credentials are provided.',
  );
}

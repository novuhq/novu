import { StringifyEnv } from '@novu/shared';
import { bool, CleanedEnv, cleanEnv, json, num, port, str, ValidatorSpec } from 'envalid';

export function validateEnv() {
  return cleanEnv(process.env, envValidators);
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;
const processEnv = process.env as Record<string, string>;

export const envValidators = {
  TZ: str({ default: 'UTC' }),
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local'], default: 'local' }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_TLS: json({ default: undefined }),
  WORKER_DEFAULT_CONCURRENCY: num({ default: undefined }),
  WORKER_DEFAULT_LOCK_DURATION: num({ default: undefined }),
  INBOUND_PARSE_MAIL_WORKER_CONCURRENCY: num({ default: undefined }),
  ENABLE_OTEL: bool({ default: false }),
  ENABLE_OTEL_LOGS: bool({ default: false }),
  OTEL_PROMETHEUS_PORT: num({ default: 9464 }),
  // S3 attachment storage — required for attachment offloading (optional for deployments with no inbound email attachments)
  S3_REGION: str({ default: '' }),
  S3_BUCKET_NAME: str({ default: '' }),
  // Optional: override S3 endpoint for LocalStack / MinIO (e.g. http://localhost:4566)
  S3_LOCAL_STACK: str({ default: '' }),
  // Optional: CDN prefix used to build public attachment URLs instead of the S3 origin
  CDN_URL: str({ default: '' }),
  // Presigned GET URL TTL in seconds (max 604800 = 7 days). Must be <= S3 bucket lifecycle expiration for inbound-mail/* objects.
  INBOUND_ATTACHMENT_URL_TTL_SECONDS: num({ default: 604800 }),
  // Set to 'true' to SMTP-reject emails when an attachment upload fails (instead of dropping the attachment and continuing)
  INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR: bool({ default: false }),
  // New Relic credentials are only required for Novu Cloud / Enterprise builds.
  ...(processEnv.IS_SELF_HOSTED !== 'true' &&
    processEnv.NOVU_ENTERPRISE === 'true' && {
      NEW_RELIC_APP_NAME: str({ default: '' }),
      NEW_RELIC_LICENSE_KEY: str({ default: '' }),
    }),
} satisfies Record<string, ValidatorSpec<unknown>>;

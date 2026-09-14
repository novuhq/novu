import { assertQueueBackendConfig } from '@novu/application-generic';
import { JobTopicNameEnum, QueueBackend, StringifyEnv } from '@novu/shared';
import { bool, CleanedEnv, cleanEnv, json, num, port, str, ValidatorSpec } from 'envalid';

export function validateEnv() {
  /*
   * envalid's default reporter prints and calls `process.exit(1)`. For an SMTP
   * service that means a crash loop with no stack, and for the e2e suite (which
   * imports `src/main`) it means mocha exits mid-run instead of failing a test.
   */
  const env = cleanEnv(process.env, envValidators, {
    reporter: ({ errors }) => {
      const problems = Object.entries(errors);

      if (problems.length === 0) {
        return;
      }

      throw new Error(
        `Invalid inbound-mail environment:\n${problems
          .map(([key, error]) => `  ${key}: ${error instanceof Error ? error.message : String(error)}`)
          .join('\n')}`
      );
    },
  });

  /*
   * Payload offload is mandatory rather than optional here: a single inbound
   * attachment can reach 5 MB against the 1 MiB SQS message ceiling, so without
   * a bucket the mail would be accepted over SMTP and then fail to enqueue.
   */
  assertQueueBackendConfig({
    topics: [JobTopicNameEnum.INBOUND_PARSE_MAIL],
    requiresPayloadOffload: true,
  });

  return env;
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;
const processEnv = process.env as Record<string, string>;

export const envValidators = {
  TZ: str({ default: 'UTC' }),
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local', 'staging'], default: 'local' }),
  /*
   * Standalone Redis only. Cluster mode reads REDIS_CLUSTER_SERVICE_HOST and
   * REDIS_CLUSTER_SERVICE_PORTS instead and never touches these, so requiring
   * them unconditionally would fail a valid cluster deployment at boot - this
   * validator did not run before, so nothing has proven them present.
   */
  ...(processEnv.IS_IN_MEMORY_CLUSTER_MODE_ENABLED === 'true'
    ? {
        REDIS_CLUSTER_SERVICE_HOST: str({ default: '' }),
        REDIS_CLUSTER_SERVICE_PORTS: str({ default: '' }),
      }
    : {
        REDIS_HOST: str(),
        REDIS_PORT: port(),
      }),
  REDIS_TLS: json({ default: undefined }),
  WORKER_DEFAULT_CONCURRENCY: num({ default: undefined }),
  WORKER_DEFAULT_LOCK_DURATION: num({ default: undefined }),
  INBOUND_PARSE_MAIL_WORKER_CONCURRENCY: num({ default: undefined }),
  /*
   * Which backend inbound mail is enqueued to. `sqs_bullmq` falls back to
   * BullMQ when the SQS send fails, so SMTP still accepts the message; `sqs`
   * lets the failure surface as a 451 and the sending MTA retries.
   */
  QUEUE_BACKEND: str({ choices: Object.values(QueueBackend), default: QueueBackend.BULLMQ }),
  SQS_QUEUE_URL_INBOUND_PARSE_MAIL: str({ default: undefined }),
  SQS_ENDPOINT: str({ default: undefined }),
  SQS_PAYLOAD_OFFLOAD_BUCKET: str({ default: undefined }),
  SQS_PAYLOAD_SIZE_THRESHOLD: num({ default: undefined }),
  AWS_REGION: str({ default: undefined }),
  NOVU_REGION: str({ default: undefined }),
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

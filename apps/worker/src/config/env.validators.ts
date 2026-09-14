import { assertQueueBackendConfig, INBOUND_PARSE_RETRY_POLICY } from '@novu/application-generic';
import {
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
  FeatureFlagsKeysEnum,
  JobTopicNameEnum,
  QueueBackend,
  StringifyEnv,
} from '@novu/shared';
import { bool, CleanedEnv, cleanEnv, json, makeValidator, num, port, str, url, ValidatorSpec } from 'envalid';
import { getRequiredWorkerTopics } from './worker-topics';

export function validateEnv() {
  const env = cleanEnv(process.env, envValidators);

  const topics = getRequiredWorkerTopics();

  /*
   * Scheduler config is demanded here and not in ws or inbound-mail because
   * the standard queue is the only topic that ever carries a delay. Payload
   * offload is only mandatory for a worker that parses inbound mail, whose
   * attachments can exceed the SQS message limit.
   */
  assertQueueBackendConfig({
    topics,
    requiresScheduler: topics.includes(JobTopicNameEnum.STANDARD),
    requiresPayloadOffload: topics.includes(JobTopicNameEnum.INBOUND_PARSE_MAIL),
  });

  return env;
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;
const processEnv = process.env as Record<string, string>; // Hold the initial process.env to avoid circular reference

const str32 = makeValidator((variable) => {
  if (!(typeof variable === 'string') || variable.length !== 32) {
    throw new Error('Expected to be string 32 char long');
  }

  return variable;
});

function getFeatureFlagValidator(key: FeatureFlagsKeysEnum): ValidatorSpec<string | number | boolean | undefined> {
  if (key.endsWith('_NUMBER') || key === FeatureFlagsKeysEnum.MAX_ENVIRONMENT_COUNT) {
    return num({ default: undefined });
  }

  if (key.startsWith('IS_')) {
    return bool({ default: false });
  }

  return str({ default: undefined });
}

/**
 * Declare your ENV variables here.
 *
 * Add a new validator to this list when you have a new ENV variable.
 */

export const envValidators = {
  TZ: str({ default: 'UTC' }),
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local', 'staging'], default: 'local' }),
  PORT: port(),
  STORE_ENCRYPTION_KEY: str32(),
  STORE_NOTIFICATION_CONTENT: bool({ default: false }),
  ENABLE_OTEL: bool({ default: false }),
  ENABLE_OTEL_LOGS: bool({ default: false }),
  OTEL_PROMETHEUS_PORT: num({ default: 9464 }),
  MAX_NOVU_INTEGRATION_MAIL_REQUESTS: num({ default: 300 }),
  NOVU_EMAIL_INTEGRATION_API_KEY: str({ default: '' }),
  /**
   * Shared inbound domain for the agent default inbox feature, e.g. `agentconnect.sh`.
   * When unset the feature is disabled and the worker falls through to the existing
   * per-tenant Domain/DomainRoute lookup.
   */
  NOVU_AGENT_SHARED_INBOUND_DOMAIN: str({ default: undefined }),
  STORAGE_SERVICE: str({ default: undefined }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_PASSWORD: str({ default: undefined }),
  REDIS_TLS: json({ default: undefined }),
  REDIS_DB_INDEX: num(),
  REDIS_CACHE_SERVICE_HOST: str({ default: undefined }),
  REDIS_CACHE_SERVICE_PORT: str({ default: undefined }),
  REDIS_CACHE_TTL: str({ default: undefined }),
  REDIS_CACHE_PASSWORD: str({ default: undefined }),
  REDIS_CACHE_CONNECTION_TIMEOUT: str({ default: undefined }),
  REDIS_CACHE_KEEP_ALIVE: str({ default: undefined }),
  REDIS_CACHE_FAMILY: str({ default: undefined }),
  REDIS_CACHE_KEY_PREFIX: str({ default: undefined }),
  REDIS_MASTER_HOST: str({ default: '' }),
  REDIS_MASTER_PORT: str({ default: '' }),
  REDIS_SLAVE_HOST: str({ default: '' }),
  REDIS_SLAVE_PORT: str({ default: '' }),
  MONGO_AUTO_CREATE_INDEXES: bool({ default: false }),
  MONGO_MAX_IDLE_TIME_IN_MS: num({ default: 1000 * 30 }),
  MONGO_MAX_POOL_SIZE: num({ default: 50 }),
  MONGO_MIN_POOL_SIZE: num({ default: 10 }),
  MONGO_URL: str(),
  SEGMENT_TOKEN: str({ default: undefined }),
  LAUNCH_DARKLY_SDK_KEY: str({ default: undefined }),
  STRIPE_API_KEY: str({ default: undefined }),
  NOTIFICATION_RETENTION_DAYS: num({ default: DEFAULT_NOTIFICATION_RETENTION_DAYS }),
  API_ROOT_URL: url(),
  SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME: str({ default: '15 days' }),
  WORKER_DEFAULT_CONCURRENCY: num({ default: undefined }),
  WORKER_DEFAULT_LOCK_DURATION: num({ default: undefined }),
  SUBSCRIBER_PROCESS_WORKER_CONCURRENCY: num({ default: undefined }),
  STANDARD_WORKER_CONCURRENCY: num({ default: undefined }),
  WORKFLOW_WORKER_CONCURRENCY: num({ default: undefined }),
  SQS_DEFAULT_CONCURRENCY: num({ default: undefined }),
  SQS_DEFAULT_VISIBILITY_TIMEOUT: num({ default: undefined }),
  SQS_DEFAULT_BATCH_SIZE: num({ default: undefined }),
  SQS_DEFAULT_WAIT_TIME_SECONDS: num({ default: undefined }),
  /*
   * Which backend the worker produces to, and whether it still runs BullMQ
   * workers. `sqs_bullmq` keeps BullMQ alive to drain jobs delayed before the
   * switch; `sqs` retires it. See assertQueueBackendConfig in
   * @novu/application-generic for the per-mode required env.
   */
  QUEUE_BACKEND: str({ choices: Object.values(QueueBackend), default: QueueBackend.BULLMQ }),
  SQS_QUEUE_URL_STANDARD: str({ default: undefined }),
  SQS_QUEUE_URL_WORKFLOW: str({ default: undefined }),
  SQS_QUEUE_URL_PROCESS_SUBSCRIBER: str({ default: undefined }),
  SQS_QUEUE_URL_WEB_SOCKETS: str({ default: undefined }),
  SQS_QUEUE_URL_INBOUND_PARSE_MAIL: str({ default: undefined }),
  SQS_ENDPOINT: str({ default: undefined }),
  SQS_PAYLOAD_OFFLOAD_BUCKET: str({ default: undefined }),
  SQS_PAYLOAD_SIZE_THRESHOLD: num({ default: undefined }),
  // Must match the inbound-parse queue's redrive policy: it is what tells the
  // worker which SQS attempt is the last one, so the terminal trace is written
  // once instead of on every redelivery.
  SQS_INBOUND_PARSE_MAX_RECEIVE_COUNT: num({ default: INBOUND_PARSE_RETRY_POLICY.attempts }),
  // EventBridge Scheduler for delays beyond the SQS 900s cap. Required once
  // QUEUE_BACKEND=sqs, since long delays then have no BullMQ fallback.
  EVENTBRIDGE_SCHEDULER_GROUP_PREFIX: str({ default: undefined }),
  EVENTBRIDGE_SCHEDULER_ROLE_ARN: str({ default: undefined }),
  EVENTBRIDGE_SCHEDULER_DLQ_ARN: str({ default: undefined }),
  EVENTBRIDGE_SCHEDULER_MAX_RETRY_ATTEMPTS: num({ default: undefined }),
  EVENTBRIDGE_SCHEDULER_MAX_EVENT_AGE_SECONDS: num({ default: undefined }),
  SOCKET_WORKER_URL: str({ default: undefined }),
  INTERNAL_SERVICES_API_KEY: str({ default: undefined }),
  STEP_RESOLVER_DISPATCH_URL: str({ default: undefined }),
  STEP_RESOLVER_HMAC_SECRET: str({ default: '' }),
  // Feature Flags
  ...(Object.fromEntries(
    Object.values(FeatureFlagsKeysEnum).map((key) => [key, getFeatureFlagValidator(key)])
  ) as Record<FeatureFlagsKeysEnum, ValidatorSpec<string | number | boolean | undefined>>),

  // Azure validators
  ...((processEnv.STORAGE_SERVICE || '').toUpperCase() === 'AZURE' && {
    AZURE_ACCOUNT_NAME: str(),
    AZURE_ACCOUNT_KEY: str(),
    AZURE_HOST_NAME: str({ default: `https://${processEnv.AZURE_ACCOUNT_NAME}.blob.core.windows.net` }),
    AZURE_CONTAINER_NAME: str({ default: 'novu' }),
  }),

  // GCS validators
  ...((processEnv.STORAGE_SERVICE || '').toUpperCase() === 'GCS' && {
    GCS_BUCKET_NAME: str(),
    GCS_DOMAIN: str(),
  }),

  // AWS validators
  ...((processEnv.STORAGE_SERVICE || '').toUpperCase() === 'AWS' && {
    S3_LOCAL_STACK: str({ default: '' }),
    S3_BUCKET_NAME: str(),
    S3_REGION: str(),
  }),

  // Production validators
  ...(['local', 'test'].includes(processEnv.NODE_ENV) && {
    NEW_RELIC_APP_NAME: str({ default: '' }),
    NEW_RELIC_LICENSE_KEY: str({ default: '' }),
    REDIS_CACHE_SERVICE_HOST: str(),
    REDIS_CACHE_SERVICE_PORT: str(),
    REDIS_CACHE_PASSWORD: str(),
  }),
} satisfies Record<string, ValidatorSpec<unknown>>;

import { StringifyEnv } from '@novu/shared';
import { bool, CleanedEnv, cleanEnv, json, num, port, str, ValidatorSpec } from 'envalid';

export function validateEnv() {
  return cleanEnv(process.env, envValidators);
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;

export const envValidators = {
  JWT_SECRET: str(),
  MONGO_AUTO_CREATE_INDEXES: bool({ default: false }),
  MONGO_MAX_IDLE_TIME_IN_MS: num({ default: 1000 * 30 }),
  MONGO_MAX_POOL_SIZE: num({ default: 50 }),
  MONGO_MIN_POOL_SIZE: num({ default: 10 }),
  MONGO_URL: str(),
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local'], default: 'local' }),
  PORT: port(),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_TLS: json({ default: undefined }),
  IS_IN_MEMORY_CLUSTER_MODE_ENABLED: bool({ default: false }),
  REDIS_CLUSTER_SERVICE_HOST: str({ default: undefined }),
  REDIS_CLUSTER_SERVICE_PORT: str({ default: undefined }),
  REDIS_CLUSTER_SERVICE_PORTS: str({ default: undefined }),
  REDIS_CLUSTER_USERNAME: str({ default: undefined }),
  REDIS_CLUSTER_PASSWORD: str({ default: undefined }),
  REDIS_CLUSTER_TLS: str({ default: undefined }),
  REDIS_MASTER_HOST: str({ default: '' }),
  REDIS_MASTER_PORT: str({ default: '' }),
  REDIS_SLAVE_HOST: str({ default: '' }),
  REDIS_SLAVE_PORT: str({ default: '' }),
  SENTRY_DSN: str({ default: undefined }),
  TZ: str({ default: 'UTC' }),
  WORKER_DEFAULT_CONCURRENCY: num({ default: undefined }),
  WORKER_DEFAULT_LOCK_DURATION: num({ default: undefined }),
  WEB_SOCKET_WORKER_CONCURRENCY: num({ default: undefined }),
  SQS_DEFAULT_CONCURRENCY: num({ default: undefined }),
  SQS_DEFAULT_VISIBILITY_TIMEOUT: num({ default: undefined }),
  SQS_DEFAULT_BATCH_SIZE: num({ default: undefined }),
  SQS_DEFAULT_WAIT_TIME_SECONDS: num({ default: undefined }),
  // SQS queue backend (optional - when unset, the WS service runs BullMQ-only)
  SQS_QUEUE_URL_STANDARD: str({ default: undefined }),
  SQS_QUEUE_URL_WORKFLOW: str({ default: undefined }),
  SQS_QUEUE_URL_PROCESS_SUBSCRIBER: str({ default: undefined }),
  SQS_QUEUE_URL_WEB_SOCKETS: str({ default: undefined }),
  SQS_ENDPOINT: str({ default: undefined }),
  SQS_PAYLOAD_OFFLOAD_BUCKET: str({ default: undefined }),
  SQS_PAYLOAD_SIZE_THRESHOLD: num({ default: undefined }),
  LAUNCH_DARKLY_SDK_KEY: str({ default: undefined }),
} satisfies Record<string, ValidatorSpec<unknown>>;

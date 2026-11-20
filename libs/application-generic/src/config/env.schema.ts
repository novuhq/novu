import type { EnvVarDefinition } from './env';

/**
 * Backend environment variables read by application-generic or by more than one app. A variable
 * only one app reads goes in that app's `src/config/env.ts`, which adds it to these through
 * `createAppEnv`. Apps read both with `env.X` from their `config/env.ts`, never `process.env.X`.
 *
 * - Add: a key (sorted) with a `description`. Set `type` and `default` here instead of
 *   parsing or falling back at the call site.
 * - Deprecate: add `deprecated` with the replacement and a `@deprecated` JSDoc tag. Delete
 *   the key once nothing reads it and deployments stopped setting it.
 * - Required at boot: also add it to the reading service's `config/env.validators.ts`.
 */
export const envSchema = {
  ACTIVE_WORKER: {
    description: 'Name of the running worker process, passed along on subscriber upserts.',
  },
  API_ROOT_URL: {
    description: 'Public api URL, used in webhook, OAuth callback and asset links.',
  },
  CI: {
    description: 'Set by CI runners. Any non-empty value marks a CI run.',
  },
  CI_EE_TEST: {
    type: 'boolean',
    description: 'Loads enterprise modules in CI test runs, as if NOVU_ENTERPRISE were true.',
  },
  DASHBOARD_URL: {
    description: 'Dashboard URL used in links. Falls back to FRONT_BASE_URL.',
  },
  ELASTICACHE_CLUSTER_SERVICE_HOST: {
    description: 'ElastiCache cluster host for the cache, set together with ELASTICACHE_CLUSTER_SERVICE_PORT.',
  },
  ENABLE_OTEL: {
    type: 'boolean',
    description: 'Exports traces and metrics over OpenTelemetry.',
  },
  FLEET_NAME: {
    default: 'default',
    description: 'Deployment name attached to worker metrics.',
  },
  FRONT_BASE_URL: {
    description: 'Legacy dashboard URL. Allowed by CORS, and used in links while DASHBOARD_URL is unset.',
  },
  /** @deprecated Use IS_IN_MEMORY_CLUSTER_MODE_ENABLED. */
  IN_MEMORY_CLUSTER_MODE_ENABLED: {
    type: 'boolean',
    deprecated: 'Use IS_IN_MEMORY_CLUSTER_MODE_ENABLED instead.',
    description: 'Legacy name of IS_IN_MEMORY_CLUSTER_MODE_ENABLED.',
  },
  IS_ANALYTICS_LOGS_ENABLED: {
    type: 'boolean',
    description: 'Writes analytics logs. Inbound mail also needs IS_INBOUND_ANALYTICS_LOGS_ENABLED.',
  },
  IS_INBOUND_ANALYTICS_LOGS_ENABLED: {
    type: 'boolean',
    description: 'Writes analytics logs for inbound mail, together with IS_ANALYTICS_LOGS_ENABLED.',
  },
  IS_IN_MEMORY_CLUSTER_MODE_ENABLED: {
    type: 'boolean',
    description: 'Connects to Redis in cluster mode (ElastiCache, MemoryDB or Azure) instead of a standalone instance.',
  },
  IS_SELF_HOSTED: {
    type: 'boolean',
    description: 'Marks a self-hosted deployment, as opposed to Novu Cloud.',
  },
  JWT_SECRET: {
    description: 'Secret that signs and verifies user session JWTs.',
  },
  LOG_LEVEL: {
    default: 'info',
    description: 'Minimum log level: trace, debug, info, warn, error, fatal or none.',
  },
  MONGO_URL: {
    description: 'MongoDB connection string.',
  },
  NEW_RELIC_LICENSE_KEY: {
    description: 'New Relic license key. Unset turns New Relic reporting off.',
  },
  NODE_ENV: {
    description: 'Runtime environment: local, dev, test, ci or production. Also picks the .env file to load.',
  },
  NOVU_EMAIL_INTEGRATION_API_KEY: {
    description: 'API key behind the built-in Novu email provider. Unset makes that provider unavailable.',
  },
  NOVU_ENTERPRISE: {
    description:
      'Turns on enterprise features when "true". Kept as a string: telemetry treats only an explicit "false" as community.',
  },
  NOVU_MANAGED_SERVICE: {
    type: 'boolean',
    description: 'Marks Novu Cloud infrastructure, which turns on managed-only metrics.',
  },
  NOVU_REGION: {
    description:
      'Deployment region. Also the AWS region for SQS, EventBridge and Secrets Manager when AWS_REGION is unset.',
  },
  PORT: {
    description: 'Port the service listens on: HTTP for api, worker and ws, SMTP for inbound-mail.',
  },
  QUEUE_BACKEND: {
    description: 'Queue backend: bullmq, sqs_bullmq or sqs.',
  },
  S3_BUCKET_NAME: {
    description: 'S3 bucket for stored files, such as inbound email attachments.',
  },
  S3_LOCAL_STACK: {
    description: 'LocalStack endpoint used instead of AWS S3 in local development.',
  },
  S3_REGION: {
    description: 'AWS region of S3_BUCKET_NAME.',
  },
  SEGMENT_TOKEN: {
    description: 'Segment write key for product analytics. Unset turns Segment off.',
  },
  SENTRY_DSN: {
    description: 'Sentry DSN. Unset turns Sentry error reporting off.',
  },
  SVIX_API_KEY: {
    description: 'Svix API key for outbound webhooks (enterprise).',
  },
} satisfies Record<string, EnvVarDefinition>;

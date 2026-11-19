import type { EnvVarDefinition } from './env';

/**
 * The one place backend environment variables are declared. Read them with `env.X` from
 * `./env` (`import { env } from '@novu/application-generic'`), never with `process.env.X`.
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
  ACTIVE_WORKERS: {
    description: 'Comma-separated worker topics this worker process runs. Empty runs every worker.',
  },
  CI_EE_TEST: {
    type: 'boolean',
    description: 'Loads enterprise modules in CI test runs, as if NOVU_ENTERPRISE were true.',
  },
  ENABLE_OTEL: {
    type: 'boolean',
    description: 'Exports traces and metrics over OpenTelemetry.',
  },
  FLEET_NAME: {
    default: 'default',
    description: 'Deployment name attached to worker metrics.',
  },
  HOST: {
    default: '0.0.0.0',
    description: 'Interface the inbound-mail SMTP server binds to.',
  },
  INBOUND_ATTACHMENT_URL_TTL_SECONDS: {
    type: 'number',
    description:
      'Lifetime of presigned inbound attachment URLs, capped at the S3 maximum. Unset uses the built-in TTL.',
  },
  INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR: {
    type: 'boolean',
    description:
      'Answers SMTP 451 when an attachment fails to upload to S3, so the sender retries, instead of embedding it inline.',
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
  NOVU_ENTERPRISE: {
    description:
      'Turns on enterprise features when "true". Kept as a string: telemetry treats only an explicit "false" as community.',
  },
  NOVU_MANAGED_SERVICE: {
    type: 'boolean',
    description: 'Marks Novu Cloud infrastructure, which turns on managed-only metrics.',
  },
  NOVU_TELEMETRY: {
    type: 'boolean',
    default: true,
    description: 'Anonymous self-hosted usage telemetry. On unless set to "false".',
  },
  OS_TELEMETRY_URL: {
    description: 'Endpoint that receives self-hosted telemetry.',
  },
  PATH: {
    description: 'System PATH. Only logged, to debug a missing Python binary for DKIM and SPF checks.',
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
  SOCKET_IO_ADMIN_PASSWORD_HASH: {
    description: 'Bcrypt hash of the Socket.IO Admin UI password. The UI is on only when the username is set too.',
  },
  SOCKET_IO_ADMIN_USERNAME: {
    description: 'Socket.IO Admin UI username. The UI is on only when the password hash is set too.',
  },
  SQS_INBOUND_PARSE_MAX_RECEIVE_COUNT: {
    type: 'number',
    description: 'Deliveries of an inbound-parse SQS message before it moves to the DLQ. Unset uses the retry policy.',
  },
  STORE_NOTIFICATION_CONTENT: {
    type: 'boolean',
    description: 'Stores rendered message content for every channel, not only In-App.',
  },
  SVIX_API_KEY: {
    description: 'Svix API key for outbound webhooks (enterprise).',
  },

  // Legacy mailin options for inbound-mail, passed through as strings.
  debug: { description: 'mailin debug option.' },
  disableDkim: { description: 'mailin option that turns DKIM checks off.' },
  disableSpamScore: { description: 'mailin option that turns spam scoring off.' },
  disableSpf: { description: 'mailin option that turns SPF checks off.' },
  enableDnsValidation: { description: 'mailin option. DNS validation of senders is off unless this is set.' },
  profile: { description: 'mailin profile option.' },
  smtpOptions: { description: 'mailin SMTP server options.' },
  verbose: { description: 'mailin verbose option.' },
} satisfies Record<string, EnvVarDefinition>;

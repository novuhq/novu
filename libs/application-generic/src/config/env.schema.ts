import { QueueBackend } from '@novu/shared';
import type { EnvVarDefinition } from './env';

/**
 * Backend environment variables every app shares: the ones application-generic reads, the ones
 * more than one app reads, and the ones a dependency every app loads reads (`readBy`). A variable
 * only one app needs goes in that app's `src/config/env.ts`, which adds it to these through
 * `createAppEnv`. Read them with `env.X` from the app's `config/env.ts` (or this lib's `env`),
 * never `process.env.X`. Together, this file and the app's file list every variable the app uses,
 * and `apps/<app>/ENVIRONMENT.md` is generated from them.
 *
 * - Add: a key (sorted) with a `description` of what it controls. Set `type` and `default` here
 *   instead of parsing or falling back at the call site.
 * - Read only by dependencies, such as '@novu/dal' or an SDK: set `readBy` instead of `type`,
 *   and say in the description what the dependency does with it and its default.
 * - Checked at boot: add `boot` with each service that checks it, 'checked' or 'required'. Set
 *   `format` or `choices` when the value must have one; `type` already checks numbers and booleans.
 * - Deprecate: add `deprecated` with the replacement and a `@deprecated` JSDoc tag, and give the
 *   replacement `replaces`, so it reads the old name while unset. Delete the key once deployments
 *   stopped setting it.
 *
 * Families read by a computed name are documented here instead of listed key by key:
 * - Feature flags: every `FeatureFlagsKeysEnum` key (`@novu/shared`) can be set as a variable of
 *   the same name. It is read only while LAUNCH_DARKLY_SDK_KEY is unset. The api and the worker
 *   check the `*_NUMBER` and `IS_*` ones at boot.
 * - ClickHouse log batching: `<TABLE>_BATCH_SIZE` (default 500 rows) and `<TABLE>_FLUSH_INTERVAL_MS`
 *   (default 3000) per log table, upper-cased, in `services/analytic-logs/log.repository.ts`.
 */
export const envSchema = {
  ACTIVE_WORKER: {
    description: 'Name of the running worker process, passed along on subscriber upserts.',
  },
  API_CONTEXT_PATH: {
    description:
      'Route prefix of the api, after GLOBAL_CONTEXT_PATH. Also part of the URL the api calls itself on for workflow previews.',
  },
  API_INTERNAL_ORIGIN: {
    description:
      'Origin that reaches the api from inside the deployment, used instead of API_ROOT_URL for bridge calls to the api, which get a 60 s timeout. With NOVU_TLS_ENABLED, previews call it instead of https://localhost.',
  },
  API_ROOT_URL: {
    format: 'url',
    boot: { api: 'required', worker: 'required' },
    description: 'Public api URL, used in webhook, OAuth callback and asset links.',
  },
  AWS_ACCESS_KEY_ID: {
    readBy: ['AWS SDK'],
    description:
      'AWS access key for S3, SQS, EventBridge Scheduler and Secrets Manager. Unset uses the default credential chain, such as the task role.',
  },
  AWS_REGION: {
    description:
      'AWS region for SQS, the SQS payload bucket and EventBridge Scheduler. Falls back to NOVU_REGION, then us-east-1.',
  },
  AWS_SECRET_ACCESS_KEY: {
    readBy: ['AWS SDK'],
    description: 'Secret for AWS_ACCESS_KEY_ID.',
  },
  AZURE_ACCOUNT_KEY: {
    boot: { api: { required: 'storage-azure' }, worker: { required: 'storage-azure' } },
    description: 'Azure Storage account key, with STORAGE_SERVICE=AZURE.',
  },
  AZURE_ACCOUNT_NAME: {
    boot: { api: { required: 'storage-azure' }, worker: { required: 'storage-azure' } },
    description: 'Azure Storage account name, with STORAGE_SERVICE=AZURE.',
  },
  AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_HOST: {
    description: 'Azure Cache for Redis cluster host, for the Azure in-memory provider.',
  },
  AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_PASSWORD: {
    description: 'Azure Cache for Redis cluster password.',
  },
  AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_PORT: {
    description: 'Azure Cache for Redis cluster port.',
  },
  AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_TLS: {
    description: 'Connects to Azure Cache for Redis over TLS, also when unset, unless false, 0, no or off.',
  },
  AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_USERNAME: {
    description: 'Azure Cache for Redis cluster username.',
  },
  AZURE_CONTAINER_NAME: {
    description:
      'Azure Blob container for stored files, with STORAGE_SERVICE=AZURE. Uploads, reads and deletes fail while it is unset; signed URLs fall back to "novu".',
  },
  AZURE_HOST_NAME: {
    description: 'Azure Blob endpoint. Unset uses https://<AZURE_ACCOUNT_NAME>.blob.core.windows.net.',
  },
  BLUEPRINT_CREATOR: {
    readBy: ['@novu/dal'],
    description: 'Organization whose Production workflows are served as workflow blueprints.',
  },
  BROADCAST_QUEUE_CHUNK_SIZE: {
    type: 'number',
    description: 'Subscribers per job when a broadcast trigger fans out. Unset or 0 uses 100.',
  },
  CDN_URL: {
    description: 'CDN origin for stored file URLs, used instead of the storage bucket URL.',
  },
  CI: {
    description: 'Set by CI runners. Any non-empty value marks a CI run.',
  },
  CI_EE_TEST: {
    type: 'boolean',
    description: 'Loads enterprise modules in CI test runs, as if NOVU_ENTERPRISE were true.',
  },
  CLICK_HOUSE_DATABASE: {
    description:
      'ClickHouse database for logs, traces and analytics. ClickHouse stays off unless this and CLICK_HOUSE_URL are both set.',
  },
  CLICK_HOUSE_MAX_OPEN_CONNECTIONS: {
    type: 'number',
    default: 10,
    description: 'Open ClickHouse connections per process.',
  },
  CLICK_HOUSE_PASSWORD: {
    description: 'ClickHouse password.',
  },
  CLICK_HOUSE_URL: {
    description: 'ClickHouse URL. ClickHouse stays off unless this and CLICK_HOUSE_DATABASE are both set.',
  },
  CLICK_HOUSE_USER: {
    description: 'ClickHouse username.',
  },
  DASHBOARD_URL: {
    description: 'Dashboard URL used in links. Falls back to FRONT_BASE_URL.',
  },
  DISABLE_TTL: {
    readBy: ['@novu/dal'],
    description:
      '"true" turns off the TTL indexes that expire documents after 48 hours. They are also off when NOVU_MANAGED_SERVICE is true.',
  },
  ELASTICACHE_CLUSTER_SERVICE_HOST: {
    description:
      'ElastiCache cluster host for the cache and WebSocket Redis on Novu Cloud, set together with ELASTICACHE_CLUSTER_SERVICE_PORT. Self-hosted enterprise uses it instead of Redis master/replica when both are set.',
  },
  ELASTICACHE_CLUSTER_SERVICE_PORT: {
    description: 'ElastiCache cluster port, set together with ELASTICACHE_CLUSTER_SERVICE_HOST.',
  },
  ELASTICACHE_CLUSTER_SERVICE_TLS: {
    description: 'Connects to ElastiCache over TLS, also when unset, unless false, 0, no or off.',
  },
  ENABLE_OTEL: {
    type: 'boolean',
    boot: { api: 'checked', worker: 'checked', 'inbound-mail': 'checked' },
    description: 'Exports traces and metrics over OpenTelemetry. Also read by the instrument.ts preload.',
  },
  ENABLE_OTEL_LOGS: {
    type: 'boolean',
    boot: { api: 'checked', worker: 'checked', 'inbound-mail': 'checked' },
    description: 'Also exports logs over OpenTelemetry, with ENABLE_OTEL.',
  },
  EVENTBRIDGE_SCHEDULER_DLQ_ARN: {
    description: 'SQS queue for delayed jobs EventBridge Scheduler could not deliver.',
  },
  EVENTBRIDGE_SCHEDULER_GROUP_PREFIX: {
    description:
      'Prefix of the EventBridge Scheduler groups that hold delays longer than SQS allows (15 minutes). Required once QUEUE_BACKEND=sqs.',
  },
  EVENTBRIDGE_SCHEDULER_MAX_EVENT_AGE_SECONDS: {
    format: 'number',
    boot: { api: 'checked', worker: 'checked' },
    description:
      'Seconds EventBridge Scheduler keeps retrying a delayed job. Unset or not a positive number uses the built-in value.',
  },
  EVENTBRIDGE_SCHEDULER_MAX_RETRY_ATTEMPTS: {
    format: 'number',
    boot: { api: 'checked', worker: 'checked' },
    description:
      'Retries EventBridge Scheduler makes for a delayed job. Unset or not a positive number uses the built-in value.',
  },
  EVENTBRIDGE_SCHEDULER_ROLE_ARN: {
    description: 'IAM role EventBridge Scheduler assumes to send delayed jobs to SQS. Required once QUEUE_BACKEND=sqs.',
  },
  FLEET_NAME: {
    default: 'default',
    description: 'Deployment name attached to worker metrics.',
  },
  FRONT_BASE_URL: {
    boot: { api: 'required' },
    description: 'Legacy dashboard URL. Allowed by CORS, and used in links while DASHBOARD_URL is unset.',
  },
  GCS_BUCKET_NAME: {
    boot: { api: { required: 'storage-gcs' }, worker: { required: 'storage-gcs' } },
    description: 'Google Cloud Storage bucket, with STORAGE_SERVICE=GCS.',
  },
  GCS_DOMAIN: {
    boot: { api: { required: 'storage-gcs' } },
    description: 'Custom domain for Google Cloud Storage file URLs.',
  },
  GLOBAL_CONTEXT_PATH: {
    description: 'Route prefix in front of every service, before its own prefix such as API_CONTEXT_PATH.',
  },
  HOSTING_PLATFORM: {
    default: 'Docker',
    description: 'Hosting platform added to every log line.',
  },
  INBOUND_PARSE_MAIL_WORKER_CONCURRENCY: {
    type: 'number',
    boot: { 'inbound-mail': 'checked' },
    description:
      'Concurrency of the inbound-parse-mail worker. Unset uses WORKER_DEFAULT_CONCURRENCY, then the built-in value.',
  },
  INTERNAL_SERVICES_API_KEY: {
    description: 'API key sent to the Cloudflare socket worker at SOCKET_WORKER_URL.',
  },
  /** @deprecated Use IS_IN_MEMORY_CLUSTER_MODE_ENABLED. */
  IN_MEMORY_CLUSTER_MODE_ENABLED: {
    type: 'boolean',
    deprecated: 'Use IS_IN_MEMORY_CLUSTER_MODE_ENABLED instead.',
    description: 'Legacy name of IS_IN_MEMORY_CLUSTER_MODE_ENABLED, read while that one is unset.',
  },
  IN_MEMORY_PROVIDER_SERVICE_READINESS_TIMEOUT: {
    type: 'number',
    default: 100,
    description: 'Milliseconds between Redis readiness checks at boot.',
  },
  IN_MEMORY_PROVIDER_SERVICE_READINESS_TIMEOUT_RETRIES: {
    type: 'number',
    default: 10,
    description: 'Redis readiness checks at boot before the service carries on without a ready client.',
  },
  IS_ANALYTICS_LOGS_ENABLED: {
    type: 'boolean',
    description: 'Writes analytics logs. Inbound mail also needs IS_INBOUND_ANALYTICS_LOGS_ENABLED.',
  },
  IS_DOCKER_HOSTED: {
    readBy: ['@novu/ee-billing'],
    description: '"true" skips quota throttling, as on a Docker self-hosted deployment.',
  },
  IS_INBOUND_ANALYTICS_LOGS_ENABLED: {
    type: 'boolean',
    description: 'Writes analytics logs for inbound mail, together with IS_ANALYTICS_LOGS_ENABLED.',
  },
  IS_IN_MEMORY_CLUSTER_MODE_ENABLED: {
    type: 'boolean',
    replaces: 'IN_MEMORY_CLUSTER_MODE_ENABLED',
    boot: { api: 'checked', worker: 'checked', ws: 'checked', 'inbound-mail': 'checked' },
    description:
      'Connects to Redis in cluster mode (ElastiCache, MemoryDB or Azure) instead of a standalone instance. Unset reads IN_MEMORY_CLUSTER_MODE_ENABLED.',
  },
  IS_SELF_HOSTED: {
    type: 'boolean',
    description: 'Marks a self-hosted deployment, as opposed to Novu Cloud.',
  },
  JWT_SECRET: {
    boot: { api: 'required', ws: 'required' },
    description: 'Secret that signs and verifies user session JWTs.',
  },
  LAUNCH_DARKLY_SDK_KEY: {
    description:
      'LaunchDarkly SDK key for feature flags. Unset reads each flag from the environment variable of the same name.',
  },
  LOGGING_LEVEL: {
    description: 'Same as LOG_LEVEL, and takes precedence over it.',
  },
  LOG_LEVEL: {
    default: 'info',
    choices: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
    boot: { api: 'required' },
    description: 'Minimum log level: trace, debug, info, warn, error, fatal or none. LOGGING_LEVEL takes precedence.',
  },
  MAX_NOVU_INTEGRATION_CHAT_REQUESTS: {
    type: 'number',
    default: 300,
    description: 'Chat messages an organization can send each month through the built-in Novu chat integration.',
  },
  MAX_NOVU_INTEGRATION_MAIL_REQUESTS: {
    type: 'number',
    default: 300,
    boot: { worker: 'checked' },
    description: 'Emails an organization can send each month through the built-in Novu email integration.',
  },
  MAX_NOVU_INTEGRATION_SMS_REQUESTS: {
    type: 'number',
    default: 20,
    description: 'SMS an organization can send each month through the built-in Novu SMS integration.',
  },
  MAX_NOVU_MANAGED_CLAUDE_CONVERSATIONS: {
    type: 'number',
    default: 10,
    boot: { api: 'checked' },
    description: 'Conversations a demo agent can have on the built-in Novu Claude integration.',
  },
  MAX_NOVU_MANAGED_CLAUDE_TOKENS_PER_CONVERSATION: {
    type: 'number',
    default: 100000,
    boot: { api: 'checked' },
    description: 'Tokens a demo agent conversation can use on the built-in Novu Claude integration.',
  },
  MEMORY_DB_CLUSTER_SERVICE_CONNECTION_TIMEOUT: {
    description: 'MemoryDB connect timeout in milliseconds.',
  },
  MEMORY_DB_CLUSTER_SERVICE_FAMILY: {
    description: 'IP family for MemoryDB connections: 4 or 6.',
  },
  MEMORY_DB_CLUSTER_SERVICE_HOST: {
    description:
      'MemoryDB cluster host for the BullMQ queues on Novu Cloud, set together with MEMORY_DB_CLUSTER_SERVICE_PORT. Self-hosted enterprise opts in by setting both.',
  },
  MEMORY_DB_CLUSTER_SERVICE_KEEP_ALIVE: {
    description: 'MemoryDB TCP keep-alive delay in milliseconds.',
  },
  MEMORY_DB_CLUSTER_SERVICE_KEY_PREFIX: {
    description: 'Prefix added to every MemoryDB key.',
  },
  MEMORY_DB_CLUSTER_SERVICE_PASSWORD: {
    description: 'MemoryDB password.',
  },
  MEMORY_DB_CLUSTER_SERVICE_PORT: {
    description: 'MemoryDB cluster port, set together with MEMORY_DB_CLUSTER_SERVICE_HOST.',
  },
  MEMORY_DB_CLUSTER_SERVICE_TLS: {
    description: 'Connects to MemoryDB over TLS, also when unset, unless false, 0, no or off.',
  },
  MEMORY_DB_CLUSTER_SERVICE_TTL: {
    description: 'Default key TTL in seconds for MemoryDB.',
  },
  MEMORY_DB_CLUSTER_SERVICE_USERNAME: {
    description: 'MemoryDB username.',
  },
  MIXPANEL_HOST: {
    description: 'Mixpanel API host override.',
  },
  MIXPANEL_TOKEN: {
    description: 'Mixpanel project token for product analytics. Unset turns Mixpanel off.',
  },
  MONGO_AUTH_MECHANISM: {
    readBy: ['@novu/dal'],
    description: 'MongoDB auth mechanism. Unset uses DEFAULT.',
  },
  MONGO_AUTO_CREATE_INDEXES: {
    readBy: ['@novu/dal'],
    format: 'boolean',
    boot: { api: 'checked', worker: 'checked', ws: 'checked' },
    description: '"true" builds missing MongoDB indexes at boot.',
  },
  MONGO_MAX_IDLE_TIME_IN_MS: {
    readBy: ['@novu/dal'],
    format: 'number',
    boot: { api: 'checked', worker: 'checked', ws: 'checked' },
    description: 'Milliseconds a pooled MongoDB connection can stay idle before it closes. Unset uses 30000.',
  },
  MONGO_MAX_POOL_SIZE: {
    readBy: ['@novu/dal'],
    format: 'number',
    boot: { api: 'checked', worker: 'checked', ws: 'checked' },
    description: 'Maximum MongoDB connections per process. Unset uses 50.',
  },
  MONGO_MIN_POOL_SIZE: {
    readBy: ['@novu/dal'],
    format: 'number',
    boot: { api: 'checked', worker: 'checked', ws: 'checked' },
    description: 'Minimum MongoDB connections per process. Unset uses 10.',
  },
  MONGO_URL: {
    boot: { api: 'required', worker: 'required', ws: 'required' },
    description: 'MongoDB connection string.',
  },
  MULTICAST_QUEUE_CHUNK_SIZE: {
    type: 'number',
    description: 'Subscribers per job when a trigger to many subscribers or topics fans out. Unset or 0 uses 100.',
  },
  NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED: {
    readBy: ['New Relic agent'],
    description: 'Overrides whether the New Relic agent forwards application logs. newrelic.ts turns it on.',
  },
  NEW_RELIC_APP_NAME: {
    description:
      'New Relic application name, read by the newrelic.ts preload. With NEW_RELIC_LICENSE_KEY, Redis calls are also instrumented.',
  },
  NEW_RELIC_ENABLED: {
    readBy: ['New Relic agent'],
    description: '"false" turns the New Relic agent off even when a license key is set.',
  },
  NEW_RELIC_LICENSE_KEY: {
    description: 'New Relic license key, read by the newrelic.ts preload. Unset turns New Relic reporting off.',
  },
  NODE_ENV: {
    choices: ['dev', 'test', 'production', 'ci', 'local'],
    boot: {
      api: 'checked',
      worker: { choices: ['dev', 'test', 'production', 'ci', 'local', 'staging'] },
      ws: 'checked',
      'inbound-mail': { choices: ['dev', 'test', 'production', 'ci', 'local', 'staging'] },
    },
    description: 'Runtime environment: local, dev, test, ci or production. Also picks the .env file to load.',
  },
  NOVU_AGENT_INBOX_INBOUND_DOMAIN: {
    description:
      'Shared inbound domain for Agent Inbox (Human) agents, e.g. agentinbox.md. Unset or invalid falls back to NOVU_AGENT_SHARED_INBOUND_DOMAIN. US only.',
  },
  NOVU_AGENT_SHARED_INBOUND_DOMAIN: {
    description:
      'Shared inbound domain for agent default inboxes, e.g. agentconnect.sh. Unset turns the shared inbox off, and inbound mail uses the per-tenant domain routes.',
  },
  NOVU_EMAIL_INTEGRATION_API_KEY: {
    description: 'API key behind the built-in Novu email provider. Unset makes that provider unavailable.',
  },
  NOVU_ENTERPRISE: {
    description:
      'Turns on enterprise features when "true". Kept as a string: telemetry treats only an explicit "false" as community.',
  },
  NOVU_INTERNAL_SECRET_KEY: {
    description:
      "Secret key of Novu's internal environment, which runs the api's own workflows and support requests. @novu/ee-billing also sends usage alerts and reports with it, in the api and the worker.",
  },
  NOVU_MANAGED_CLAUDE_API_KEY: {
    description:
      'Anthropic API key behind the built-in Novu Claude integration for demo agents. Unset makes that integration unavailable.',
  },
  NOVU_MANAGED_SERVICE: {
    type: 'boolean',
    description: 'Marks Novu Cloud infrastructure, which turns on managed-only metrics and turns off the TTL indexes.',
  },
  NOVU_REGION: {
    description:
      'Deployment region, sent to LaunchDarkly. Also the AWS region for Secrets Manager, and for SQS and EventBridge when AWS_REGION is unset.',
  },
  NOVU_SAFE_OUTBOUND_ALLOW: {
    readBy: ['@novu/shared'],
    description:
      'Comma-separated IPs, CIDRs, hostnames or hostname suffixes that outbound requests, such as webhooks, HTTP steps and bridge calls, may reach even when they resolve to a private address.',
  },
  NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS: {
    readBy: ['@novu/shared'],
    description: 'Joined with NOVU_SAFE_OUTBOUND_ALLOW. Lets tests reach local servers.',
  },
  NOVU_SLACK_INTEGRATION_CLIENT_ID: {
    description: "Client id of Novu's Slack app behind the built-in Novu Slack integration.",
  },
  NOVU_SLACK_INTEGRATION_CLIENT_SECRET: {
    description: "Client secret of Novu's Slack app behind the built-in Novu Slack integration.",
  },
  NOVU_SMS_INTEGRATION_ACCOUNT_SID: {
    description: 'Twilio account SID behind the built-in Novu SMS integration.',
  },
  NOVU_SMS_INTEGRATION_SENDER: {
    description: 'Sender number of the built-in Novu SMS integration.',
  },
  NOVU_SMS_INTEGRATION_TOKEN: {
    description: 'Twilio auth token behind the built-in Novu SMS integration.',
  },
  NOVU_TLS_CA_BASE64: {
    description:
      'Private CA as base64 PEM, trusted only for calls to Novu itself. Set this or NOVU_TLS_CA_FILE when NOVU_TLS_ENABLED is on.',
  },
  NOVU_TLS_CA_FILE: {
    description: 'Path to the private CA PEM. Set this or NOVU_TLS_CA_BASE64 when NOVU_TLS_ENABLED is on.',
  },
  NOVU_TLS_CERT_BASE64: {
    description: 'TLS certificate as base64 PEM. Set this or NOVU_TLS_CERT_FILE when NOVU_TLS_ENABLED is on.',
  },
  NOVU_TLS_CERT_FILE: {
    description: 'Path to the TLS certificate PEM. Set this or NOVU_TLS_CERT_BASE64 when NOVU_TLS_ENABLED is on.',
  },
  NOVU_TLS_ENABLED: {
    format: 'boolean',
    boot: { api: 'checked', worker: 'checked', ws: 'checked' },
    description:
      'Serves HTTPS when "true", "1" or "yes". Enterprise self-hosted only. Kept as a string because those three values all count.',
  },
  NOVU_TLS_KEY_BASE64: {
    description: 'TLS private key as base64 PEM. Set this or NOVU_TLS_KEY_FILE when NOVU_TLS_ENABLED is on.',
  },
  NOVU_TLS_KEY_FILE: {
    description: 'Path to the TLS private key PEM. Set this or NOVU_TLS_KEY_BASE64 when NOVU_TLS_ENABLED is on.',
  },
  NOVU_TLS_KEY_PASSPHRASE: {
    description: 'Passphrase of the TLS private key, if it has one.',
  },
  OTEL_CAPTURE_DB_STATEMENTS: {
    type: 'boolean',
    description: 'Records database statements in OpenTelemetry spans.',
  },
  OTEL_DISABLE_PROMETHEUS: {
    type: 'boolean',
    description: 'Skips the Prometheus scrape endpoint that runs next to the OTLP metrics exporter.',
  },
  OTEL_EXPORTER_OTLP_ENDPOINT: {
    readBy: ['OpenTelemetry SDK'],
    description:
      'OTLP endpoint for traces, metrics and logs. OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_ENDPOINT override it per signal.',
  },
  OTEL_EXPORTER_OTLP_HEADERS: {
    readBy: ['OpenTelemetry SDK'],
    description:
      'Headers sent to the OTLP endpoint, such as an API key. OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_HEADERS override them per signal.',
  },
  OTEL_LOG_LEVEL: {
    default: 'warn',
    description: 'OpenTelemetry diagnostic log level: none, error, warn, info, debug, verbose or all.',
  },
  OTEL_METRIC_EXPORT_INTERVAL: {
    type: 'number',
    default: 60000,
    description: 'Milliseconds between OTLP metric exports.',
  },
  OTEL_METRIC_EXPORT_TIMEOUT: {
    type: 'number',
    default: 30000,
    description: 'Milliseconds an OTLP metric export can take.',
  },
  OTEL_NODE_RESOURCE_DETECTORS: {
    readBy: ['OpenTelemetry SDK'],
    description: 'Resource detectors the OpenTelemetry SDK runs, which also merge OTEL_RESOURCE_ATTRIBUTES.',
  },
  OTEL_PROMETHEUS_PORT: {
    type: 'number',
    default: 9464,
    boot: { api: 'checked', worker: 'checked', 'inbound-mail': 'checked' },
    description: 'Port of the Prometheus scrape endpoint.',
  },
  OTEL_RESOURCE_ATTRIBUTES: {
    readBy: ['OpenTelemetry SDK'],
    description: 'Extra resource attributes as key=value pairs, added to every span, metric and log.',
  },
  OTEL_SERVICE_NAME: {
    description: 'OpenTelemetry service name. Unset uses the service name each app passes in.',
  },
  OTEL_SERVICE_VERSION: {
    description: 'OpenTelemetry service version. Unset uses the version each app passes in.',
  },
  PLAIN_SUPPORT_KEY: {
    description: 'Plain API key for support requests. Unset turns the Plain client off.',
  },
  PORT: {
    format: 'port',
    boot: { api: 'required', worker: 'required', ws: 'required' },
    description:
      'Port the service listens on: HTTP for api, worker and ws, SMTP for inbound-mail. Also the port of the api preview loopback.',
  },
  QUEUE_BACKEND: {
    choices: Object.values<string>(QueueBackend),
    boot: { api: 'checked', worker: 'checked', ws: 'checked', 'inbound-mail': 'checked' },
    description: 'Queue backend: bullmq, sqs_bullmq or sqs.',
  },
  REDIS_CACHE_ENABLE_AUTOPIPELINING: {
    type: 'boolean',
    description: 'Batches cache commands with ioredis auto-pipelining.',
  },
  REDIS_CLUSTER_CONNECTION_TIMEOUT: {
    description:
      'Connect timeout in milliseconds for the cluster providers: Redis Cluster, ElastiCache, Azure and master/replica.',
  },
  REDIS_CLUSTER_FAMILY: {
    description: 'IP family for the cluster providers: 4 or 6.',
  },
  REDIS_CLUSTER_KEEP_ALIVE: {
    description: 'TCP keep-alive delay in milliseconds for the cluster providers.',
  },
  REDIS_CLUSTER_KEY_PREFIX: {
    description: 'Prefix added to every key by the cluster providers.',
  },
  REDIS_CLUSTER_PASSWORD: {
    description: 'Password for Redis Cluster, ElastiCache and master/replica.',
  },
  REDIS_CLUSTER_SERVICE_HOST: {
    description:
      'Redis Cluster host, or comma-separated hosts. Novu Cloud falls back to it when ElastiCache or MemoryDB is not configured; self-hosted enterprise uses it for queues with cluster mode on.',
  },
  REDIS_CLUSTER_SERVICE_PORT: {
    description: 'Redis Cluster port, used for every host in REDIS_CLUSTER_SERVICE_HOST.',
  },
  REDIS_CLUSTER_SERVICE_PORTS: {
    description: 'Comma-separated Redis Cluster ports, paired in order with REDIS_CLUSTER_SERVICE_HOST.',
  },
  REDIS_CLUSTER_TLS: {
    description: 'Connects Redis Cluster and master/replica over TLS, unless false, 0, no or off.',
  },
  REDIS_CLUSTER_TTL: {
    description: 'Default key TTL in seconds for the cluster providers.',
  },
  REDIS_CLUSTER_USERNAME: {
    description: 'Redis Cluster username.',
  },
  REDIS_CONNECT_TIMEOUT: {
    description: 'Connect timeout in milliseconds for single-node Redis.',
  },
  REDIS_DB_INDEX: {
    format: 'number',
    boot: { worker: { required: 'bullmq' } },
    description: 'Database index on single-node Redis.',
  },
  REDIS_FAMILY: {
    description: 'IP family for single-node Redis: 4 or 6.',
  },
  REDIS_HOST: {
    boot: {
      api: { when: 'standalone-redis', required: true },
      worker: { when: 'standalone-redis', required: true },
      ws: { when: 'standalone-redis', required: true },
      'inbound-mail': { when: 'bullmq-without-cluster-mode', required: true },
    },
    description:
      'Single-node Redis host, used by community self-hosted for the cache, WebSockets and BullMQ, and by self-hosted enterprise for BullMQ.',
  },
  REDIS_KEEP_ALIVE: {
    description: 'TCP keep-alive delay in milliseconds for single-node Redis.',
  },
  REDIS_MASTER_HOST: {
    description: 'Primary host of the Redis master/replica cache on self-hosted enterprise.',
  },
  REDIS_MASTER_PORT: {
    description: 'Primary port of the Redis master/replica cache.',
  },
  REDIS_PASSWORD: {
    description: 'Single-node Redis password.',
  },
  REDIS_PORT: {
    format: 'port',
    boot: {
      api: { when: 'standalone-redis', required: true },
      worker: { when: 'standalone-redis', required: true },
      ws: { when: 'standalone-redis', required: true },
      'inbound-mail': { when: 'bullmq-without-cluster-mode', required: true },
    },
    description: 'Single-node Redis port.',
  },
  REDIS_PREFIX: {
    description: 'Prefix added to every single-node Redis key. Also read by getRedisPrefix in @novu/shared.',
  },
  REDIS_SKIP_VERSION_CHECK: {
    type: 'boolean',
    description: 'Skips the Redis server version check at boot.',
  },
  REDIS_SLAVE_HOST: {
    description: 'Replica host of the Redis master/replica cache.',
  },
  REDIS_SLAVE_PORT: {
    description: 'Replica port of the Redis master/replica cache.',
  },
  REDIS_TLS: {
    format: 'tls-flag',
    boot: { api: 'checked', worker: 'checked', ws: 'checked', 'inbound-mail': 'checked' },
    description: 'Connects to single-node Redis over TLS when set, unless false, 0, no or off.',
  },
  REDIS_TTL: {
    description: 'Default key TTL in seconds for single-node Redis.',
  },
  REQUEST_LOGS_ASYNC_INSERT: {
    description:
      'ClickHouse async inserts for request logs: on when unset or "true", off for any other value. Off in tests.',
  },
  REQUEST_LOGS_WAIT_ASYNC_INSERT: {
    description: 'Waits for request-log async inserts to land when "true". Always waits in tests.',
  },
  S3_BUCKET_NAME: {
    boot: { api: { required: 'storage-aws' }, worker: { required: 'storage-aws' } },
    description: 'S3 bucket for stored files, such as inbound email attachments.',
  },
  S3_LOCAL_STACK: {
    description: 'LocalStack endpoint used instead of AWS S3 in local development.',
  },
  S3_REGION: {
    boot: { api: { required: 'storage-aws' }, worker: { required: 'storage-aws' } },
    description: 'AWS region of S3_BUCKET_NAME.',
  },
  SECRET_NAME: {
    description:
      'AWS Secrets Manager secret whose keys are loaded into the environment at boot (enterprise). Needs NOVU_REGION. Unset boots from the environment as is.',
  },
  SEGMENT_TOKEN: {
    description: 'Segment write key for product analytics. Unset turns Segment off.',
  },
  SENTRY_DSN: {
    description: 'Sentry DSN, read by the instrument.ts preload. Unset turns Sentry error reporting off.',
  },
  SERVICE_NAME: {
    default: 'unknown-service',
    description: 'Service name attached to reported errors.',
  },
  SLACK_BILLING_WEBHOOK_URL: {
    readBy: ['@novu/ee-billing'],
    description: 'Slack webhook that announces new paid subscriptions.',
  },
  SOCKET_WORKER_URL: {
    description:
      'Cloudflare socket worker that delivers In-App updates when IS_CLOUDFLARE_SOCKETS_ENABLED is on (enterprise).',
  },
  SQS_DEFAULT_BATCH_SIZE: {
    type: 'number',
    boot: { worker: 'checked', ws: 'checked' },
    description: 'Messages per SQS receive, at most 10. Unset or 0 uses the built-in value.',
  },
  SQS_DEFAULT_CONCURRENCY: {
    type: 'number',
    boot: { worker: 'checked', ws: 'checked' },
    description:
      "Concurrency of every SQS consumer, over each worker's own concurrency. A lever to throttle SQS at runtime. Unset uses the worker's concurrency.",
  },
  SQS_DEFAULT_VISIBILITY_TIMEOUT: {
    type: 'number',
    boot: { worker: 'checked', ws: 'checked' },
    description: 'SQS visibility timeout in seconds, at most 43200. Unset or 0 uses the built-in value.',
  },
  SQS_DEFAULT_WAIT_TIME_SECONDS: {
    type: 'number',
    boot: { worker: 'checked', ws: 'checked' },
    description: 'SQS long-poll wait in seconds, at most 20. Unset or 0 uses the built-in value.',
  },
  SQS_ENDPOINT: {
    description: 'SQS endpoint override, such as LocalStack.',
  },
  SQS_PAYLOAD_OFFLOAD_BUCKET: {
    description:
      'S3 bucket for job payloads too large for an SQS message. Required for a worker that parses inbound mail on SQS.',
  },
  SQS_PAYLOAD_SIZE_THRESHOLD: {
    type: 'number',
    boot: { api: 'checked', worker: 'checked', ws: 'checked', 'inbound-mail': 'checked' },
    description:
      'Payload size in bytes above which it goes to SQS_PAYLOAD_OFFLOAD_BUCKET. Unset uses the built-in threshold.',
  },
  SQS_QUEUE_URL_INBOUND_PARSE_MAIL: {
    description:
      'SQS queue URL for the inbound-parse-mail topic. Required for that topic once QUEUE_BACKEND is not bullmq.',
  },
  SQS_QUEUE_URL_PROCESS_SUBSCRIBER: {
    description:
      'SQS queue URL for the process-subscriber topic. Required for that topic once QUEUE_BACKEND is not bullmq.',
  },
  SQS_QUEUE_URL_STANDARD: {
    description: 'SQS queue URL for the standard topic. Required for that topic once QUEUE_BACKEND is not bullmq.',
  },
  SQS_QUEUE_URL_WEB_SOCKETS: {
    description: 'SQS queue URL for the web-sockets topic. Required for that topic once QUEUE_BACKEND is not bullmq.',
  },
  SQS_QUEUE_URL_WORKFLOW: {
    description: 'SQS queue URL for the workflow topic. Required for that topic once QUEUE_BACKEND is not bullmq.',
  },
  STANDARD_WORKER_CONCURRENCY: {
    type: 'number',
    boot: { worker: 'checked' },
    description: 'Concurrency of the standard worker. Unset uses WORKER_DEFAULT_CONCURRENCY, then the built-in value.',
  },
  STEP_RESOLVER_DISPATCH_URL: {
    description:
      'Cloudflare dispatch URL that runs deployed step resolvers. Step resolver steps fail while it is unset.',
  },
  STEP_RESOLVER_HMAC_SECRET: {
    description:
      'Secret that signs requests to STEP_RESOLVER_DISPATCH_URL. Step resolver steps fail while it is unset.',
  },
  STEP_RUNS_ASYNC_INSERT: {
    description:
      'ClickHouse async inserts for step runs: on when unset or "true", off for any other value. Off in tests.',
  },
  STEP_RUNS_WAIT_ASYNC_INSERT: {
    description: 'Waits for step-run async inserts to land when "true". Always waits in tests.',
  },
  STORAGE_SERVICE: {
    description: 'Where stored files live: AWS (default, S3), GCS or AZURE.',
  },
  STORE_ENCRYPTION_KEY: {
    boot: { api: 'required', worker: { required: true, length: 32 } },
    description: '32-character key that encrypts integration credentials and other secrets at rest.',
  },
  STRIPE_API_KEY: {
    readBy: ['@novu/ee-billing'],
    description: 'Stripe secret key for subscriptions and usage reporting.',
  },
  STRIPE_CONNECT_SECRET: {
    readBy: ['@novu/ee-billing'],
    description: 'Secret that verifies Stripe webhooks.',
  },
  SUBSCRIBER_PROCESS_WORKER_CONCURRENCY: {
    type: 'number',
    boot: { worker: 'checked' },
    description:
      'Concurrency of the subscriber-process worker. Unset uses WORKER_DEFAULT_CONCURRENCY, then the built-in value.',
  },
  SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE: {
    type: 'number',
    description:
      'Topic subscribers read per batch while removing duplicates from a trigger to topics. Unset or 0 uses 100.',
  },
  SVIX_API_KEY: {
    description: 'Svix API key for outbound webhooks (enterprise).',
  },
  TENANT: {
    default: 'OS',
    description: 'Tenant added to every log line.',
  },
  THROTTLE_REDIS_TTL_BUFFER_MS: {
    type: 'number',
    description: 'Milliseconds a throttle key stays in Redis after its window ends. Unset or 0 uses 30000.',
  },
  TRACES_ASYNC_INSERT: {
    description: 'ClickHouse async inserts for traces: on when unset or "true", off for any other value. Off in tests.',
  },
  TRACES_WAIT_ASYNC_INSERT: {
    description: 'Waits for trace async inserts to land when "true". Always waits in tests.',
  },
  TZ: {
    readBy: ['Node.js'],
    description: 'Time zone of the process.',
  },
  WEB_SOCKET_WORKER_CONCURRENCY: {
    type: 'number',
    boot: { ws: 'checked' },
    description:
      'Concurrency of the web-socket worker. Unset uses WORKER_DEFAULT_CONCURRENCY, then the built-in value.',
  },
  WORKER_DEFAULT_CONCURRENCY: {
    type: 'number',
    boot: { api: 'checked', worker: 'checked', ws: 'checked', 'inbound-mail': 'checked' },
    description:
      'Concurrency of every BullMQ worker without its own *_WORKER_CONCURRENCY. Unset uses the built-in value.',
  },
  WORKER_DEFAULT_LOCK_DURATION: {
    type: 'number',
    default: 90000,
    boot: { api: 'checked', worker: 'checked', ws: 'checked', 'inbound-mail': 'checked' },
    description: 'BullMQ job lock duration in milliseconds for every worker.',
  },
  WORKFLOW_RUNS_ASYNC_INSERT: {
    description:
      'ClickHouse async inserts for workflow runs: on when unset or "true", off for any other value. Off in tests.',
  },
  WORKFLOW_RUNS_WAIT_ASYNC_INSERT: {
    description: 'Waits for workflow-run async inserts to land when "true". Always waits in tests.',
  },
  WORKFLOW_WORKER_CONCURRENCY: {
    type: 'number',
    boot: { worker: 'checked' },
    description: 'Concurrency of the workflow worker. Unset uses WORKER_DEFAULT_CONCURRENCY, then the built-in value.',
  },
  npm_package_version: {
    description:
      'Set by the package manager when a service starts through a package script. Reported as the metrics meter version.',
  },
} satisfies Record<string, EnvVarDefinition>;

import { createAppEnv, type EnvVarDefinition } from '@novu/application-generic';

/**
 * Variables only the worker uses, added to the shared ones in libs/application-generic/src/config/env.schema.ts.
 * Together the two files list every variable the worker uses, and apps/worker/ENVIRONMENT.md is generated from them.
 * Read both with `env.X` from this file; entries with `readBy` are read by those dependencies instead and have
 * no `env.X`. Their `boot` rules for `worker` decide what `validateEnv` checks.
 */
export const appEnvSchema = {
  ACTIVE_WORKERS: {
    description: 'Comma-separated worker topics this worker process runs. Empty runs every worker.',
  },
  NOVU_TELEMETRY: {
    type: 'boolean',
    default: true,
    description: 'Anonymous self-hosted usage telemetry. On unless set to "false".',
  },
  OS_TELEMETRY_URL: {
    description: 'Endpoint that receives self-hosted telemetry.',
  },
  SQS_INBOUND_PARSE_MAX_RECEIVE_COUNT: {
    type: 'number',
    boot: { worker: 'checked' },
    description: 'Deliveries of an inbound-parse SQS message before it moves to the DLQ. Unset uses the retry policy.',
  },
  STORE_NOTIFICATION_CONTENT: {
    type: 'boolean',
    boot: { worker: 'checked' },
    description: 'Stores rendered message content for every channel, not only In-App.',
  },
} satisfies Record<string, EnvVarDefinition>;

export const { env, validateEnv, warnDeprecatedEnv } = createAppEnv(appEnvSchema, {
  service: 'worker',
  checkFeatureFlags: true,
});

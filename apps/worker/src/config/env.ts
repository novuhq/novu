import { createAppEnv } from '@novu/application-generic';

/**
 * Variables only the worker reads, added to the shared ones in
 * libs/application-generic/src/config/env.schema.ts. Read both with `env.X` from this file.
 */
export const { env, warnDeprecatedEnv } = createAppEnv({
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
    description: 'Deliveries of an inbound-parse SQS message before it moves to the DLQ. Unset uses the retry policy.',
  },
  STORE_NOTIFICATION_CONTENT: {
    type: 'boolean',
    description: 'Stores rendered message content for every channel, not only In-App.',
  },
});

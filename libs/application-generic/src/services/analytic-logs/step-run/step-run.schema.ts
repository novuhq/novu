import {
  CHNullable,
  CHString,
  CHDateTime64,
  CHUInt32,
  CHLowCardinality,
  ClickhouseSchema,
  InferClickhouseSchemaType,
} from 'clickhouse-schema';
import { Prettify } from '../../../utils/prettify.type';

export const TABLE_NAME = 'step_runs';

export const stepRunSchema = new ClickhouseSchema(
  {
    id: { type: CHString() },
    created_at: { type: CHDateTime64(3, 'UTC') },
    updated_at: { type: CHDateTime64(3, 'UTC') },

    // Core step run identification
    step_run_id: { type: CHString() }, // Maps to JobEntity._id
    step_id: { type: CHString() }, // Maps to messageTemplate._id

    // Context
    organization_id: { type: CHString() },
    environment_id: { type: CHString() },
    user_id: { type: CHString() },
    subscriber_id: { type: CHString() },
    external_subscriber_id: { type: CHNullable(CHString()) },
    message_id: { type: CHNullable(CHString()) }, // Links to MessageEntity

    // Step metadata
    step_type: { type: CHLowCardinality(CHString()) }, // email, sms, in_app, push, etc.
    step_name: { type: CHString() },
    provider_id: { type: CHNullable(CHString()) },

    // Execution details
    status: { type: CHLowCardinality(CHString()) }, // pending, queued, running, completed, failed, skipped, cancelled

    // Performance metrics
    duration_ms: { type: CHNullable(CHUInt32()) },
    deferred_ms: { type: CHNullable(CHUInt32()) },

    // Error handling
    error_code: { type: CHNullable(CHString()) },
    error_message: { type: CHNullable(CHString()) },

    // Correlation
    transaction_id: { type: CHString() },
    // workflow_run_id: { type: CHString() }, // Links to workflow_runs

    // Data retention
    expires_at: { type: CHDateTime64(3, 'UTC') },
  },
  {
    order_by: 'ORDER_BY_X_LIST' as any,
    table_name: TABLE_NAME,
    engine: 'ReplacingMergeTree(updated_at)',
  }
);

export const ORDER_BY: (keyof typeof stepRunSchema.schema)[] = ['organization_id', 'step_run_id'];

export type StepType = 'email' | 'sms' | 'in_app' | 'push' | 'chat' | 'digest' | 'trigger' | 'delay' | 'custom';

export type StepRunStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'canceled'
  | 'merged'
  | 'skipped';

type NativeStepRun = InferClickhouseSchemaType<typeof stepRunSchema>;

type StepRunComplex = Omit<NativeStepRun, 'status' | 'step_type'> & {
  status: StepRunStatus;
  step_type: StepType;
};

export type StepRun = Prettify<StepRunComplex>;

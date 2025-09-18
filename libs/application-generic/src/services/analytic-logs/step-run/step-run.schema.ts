import {
  CHArray,
  CHDateTime64,
  CHLowCardinality,
  CHNullable,
  CHString,
  CHUInt8,
  ClickhouseSchema,
  InferClickhouseSchemaType,
} from 'clickhouse-schema';
import { Prettify } from '../../../utils/prettify.type';
import { StepType } from '..';

export const TABLE_NAME = 'step_runs';

const schemaDefinition = {
  id: { type: CHString() },
  created_at: { type: CHDateTime64(3, 'UTC') },
  updated_at: { type: CHDateTime64(3, 'UTC') },

  // Core step run identification
  step_run_id: { type: CHString() }, // Maps to JobEntity._id
  step_id: { type: CHString() }, // Maps to messageTemplate._id
  workflow_run_id: { type: CHNullable(CHString()) }, // Maps to NotificationEntity._id

  // Context
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  user_id: { type: CHString() },
  subscriber_id: { type: CHString() },
  external_subscriber_id: { type: CHNullable(CHString()) },
  message_id: { type: CHNullable(CHString()) }, // Links to MessageEntity
  context_keys: { type: CHArray(CHString()) }, // Array of context keys (type:identifier)

  // Step metadata
  step_type: { type: CHLowCardinality(CHString()) }, // email, sms, in_app, push, etc.
  step_name: { type: CHNullable(CHString()) }, // todo remove this parameter because we do not have step name at this stage.
  provider_id: { type: CHNullable(CHString()) },

  // Execution details
  status: { type: CHLowCardinality(CHString()) }, // pending, queued, running, completed, failed, skipped, cancelled

  // Digest data
  digest: { type: CHNullable(CHString()) }, // JSON string of digest metadata

  // Error handling
  error_code: { type: CHNullable(CHString()) },
  error_message: { type: CHNullable(CHString()) },

  // Correlation
  transaction_id: { type: CHString() },

  // Data retention
  expires_at: { type: CHDateTime64(3, 'UTC') },

  // Schedule extensions count
  schedule_extensions_count: { type: CHUInt8(0) },
};

export const ORDER_BY: (keyof typeof schemaDefinition)[] = ['organization_id', 'step_run_id'];

export const TTL: keyof typeof schemaDefinition = 'expires_at';

const clickhouseSchemaOptions = {
  table_name: TABLE_NAME,
  engine: 'ReplacingMergeTree(updated_at)',
  order_by: `(${ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(created_at)', `TTL toDateTime(${TTL})`],
};

export const stepRunSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type StepRunNonFinalStatus = 'pending' | 'queued' | 'running' | 'delayed';
export type StepRunFinalStatus = 'completed' | 'failed' | 'canceled' | 'merged' | 'skipped';
export type StepRunStatus = StepRunNonFinalStatus | StepRunFinalStatus;

type NativeStepRun = InferClickhouseSchemaType<typeof stepRunSchema>;

type StepRunComplex = Omit<NativeStepRun, 'status' | 'step_type'> & {
  status: StepRunStatus;
  step_type: StepType;
};

export type StepRun = Prettify<StepRunComplex>;

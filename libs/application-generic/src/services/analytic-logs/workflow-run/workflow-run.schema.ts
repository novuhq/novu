import { DeliveryLifecycleStatus, SeverityLevelEnum } from '@novu/shared';
import {
  CHArray,
  CHBoolean,
  CHDateTime64,
  CHLowCardinality,
  CHNullable,
  CHString,
  ClickhouseSchema,
  InferClickhouseSchemaType,
} from 'clickhouse-schema';
import { Prettify } from '../../../utils/prettify.type';

export const TABLE_NAME = 'workflow_runs';

const schemaDefinition = {
  id: { type: CHString() },
  created_at: { type: CHDateTime64(3, 'UTC') },

  // todo: redundant, remove this field
  updated_at: { type: CHDateTime64(3, 'UTC') },

  // Core workflow run identification
  workflow_run_id: { type: CHString() }, // Maps to NotificationEntity._id
  workflow_id: { type: CHString() }, // Maps to NotificationTemplateEntity._id
  workflow_name: { type: CHString() }, // Maps to NotificationTemplateEntity.name

  // Context
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  user_id: { type: CHNullable(CHString()) },
  subscriber_id: { type: CHString() },
  external_subscriber_id: { type: CHNullable(CHString()) },
  context_keys: { type: CHArray(CHString()) }, // Array of context keys (type:identifier)

  // Execution metadata
  status: { type: CHLowCardinality(CHString()) }, // processing, error, completed
  delivery_lifecycle_status: { type: CHLowCardinality(CHString('')) },
  delivery_lifecycle_detail: { type: CHString('') },
  trigger_identifier: { type: CHString() }, // The event identifier that triggered the workflow

  // Correlation and grouping
  transaction_id: { type: CHString() },
  channels: { type: CHString() }, // JSON array of channels: ["email", "sms", "push"]

  // Subscriber context
  subscriber_to: { type: CHNullable(CHString()) }, // JSON representation of the 'to' field
  payload: { type: CHNullable(CHString()) }, // JSON representation of the payload
  control_values: { type: CHNullable(CHString()) }, // JSON representation of controls

  // Topic information
  topics: { type: CHNullable(CHString()) }, // JSON array of topics

  // Digest information
  is_digest: { type: CHLowCardinality(CHString()) }, // 'true' or 'false'
  digested_workflow_run_id: { type: CHNullable(CHString()) }, // Reference to parent digest if this is a digested notification

  // Data retention
  expires_at: { type: CHDateTime64(3, 'UTC') },

  severity: { type: CHLowCardinality(CHString(SeverityLevelEnum.NONE)) }, // severity of the workflow run
  critical: { type: CHBoolean(false) }, // critical flag of the workflow run
};

export const ORDER_BY: (keyof typeof schemaDefinition)[] = ['organization_id', 'workflow_run_id'];

export const TTL: keyof typeof schemaDefinition = 'expires_at';

const clickhouseSchemaOptions = {
  table_name: TABLE_NAME,
  engine: 'ReplacingMergeTree(updated_at)',
  order_by: `(${ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(created_at)', `TTL toDateTime(${TTL})`],
};

export const workflowRunSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export enum WorkflowRunStatusEnum {
  /**
   * @deprecated please use processing instead nv-6562
   */
  PENDING = 'pending',
  PROCESSING = 'processing',
  /**
   * @deprecated please use COMPLETED instead nv-6562
   */
  SUCCESS = 'success',
  COMPLETED = 'completed',
  ERROR = 'error',
}

type NativeWorkflowRun = InferClickhouseSchemaType<typeof workflowRunSchema>;

export type WorkflowRun = Prettify<
  Omit<NativeWorkflowRun, 'status' | 'delivery_lifecycle_status' | 'severity'> & {
    status: WorkflowRunStatusEnum;
    delivery_lifecycle_status: DeliveryLifecycleStatus;
    severity: SeverityLevelEnum;
  }
>;

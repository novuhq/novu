import { DeliveryLifecycleEventType } from '@novu/shared';
import {
  CHDate,
  CHLowCardinality,
  CHString,
  CHUInt64,
  ClickhouseSchema,
  InferClickhouseSchemaType,
} from 'clickhouse-schema';
import { Prettify } from '../../../utils/prettify.type';
import { WorkflowRunStatusType } from '../trace-log/trace-log.schema';

export const WORKFLOW_RUN_COUNT_TABLE_NAME = 'workflow_run_count';

const schemaDefinition = {
  date: { type: CHDate() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  event_type: { type: CHLowCardinality(CHString()) },
  workflow_run_id: { type: CHString() },
  count: { type: CHUInt64() },
  expires_at: { type: CHDate() },
};

export const WORKFLOW_RUN_COUNT_ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'event_type',
  'date',
  'workflow_run_id',
];

const clickhouseSchemaOptions = {
  table_name: WORKFLOW_RUN_COUNT_TABLE_NAME,
  engine: 'SummingMergeTree',
  order_by: `(${WORKFLOW_RUN_COUNT_ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(date)', 'TTL expires_at'],
};

export const workflowRunCountSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

type NativeWorkflowRunCount = InferClickhouseSchemaType<typeof workflowRunCountSchema>;

type WorkflowRunCountEventType = WorkflowRunStatusType | DeliveryLifecycleEventType;

export type WorkflowRunCountComplex = Omit<NativeWorkflowRunCount, 'event_type'> & {
  event_type: WorkflowRunCountEventType;
};

export type WorkflowRunCount = Prettify<WorkflowRunCountComplex>;

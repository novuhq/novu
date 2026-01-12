import { CHDate, CHLowCardinality, CHString, CHUInt64, ClickhouseSchema } from 'clickhouse-schema';

export const WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME = 'workflow_activity_counts';

const schemaDefinition = {
  date: { type: CHDate() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  workflow_id: { type: CHString() },
  external_subscriber_id: { type: CHString() },
  event_type: { type: CHLowCardinality(CHString()) },
  count: { type: CHUInt64() },
};

export const WORKFLOW_ACTIVITY_COUNTS_ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'workflow_id',
  'date',
  'external_subscriber_id',
  'event_type',
];

const clickhouseSchemaOptions = {
  table_name: WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME,
  engine: 'SummingMergeTree',
  order_by: `(${WORKFLOW_ACTIVITY_COUNTS_ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(date)'],
};

export const workflowActivityCountsSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type WorkflowActivityCount = {
  date: string;
  organization_id: string;
  environment_id: string;
  workflow_id: string;
  external_subscriber_id: string;
  event_type: string;
  count: number;
};

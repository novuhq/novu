import { CHDate, CHLowCardinality, CHString, CHUInt64, ClickhouseSchema } from 'clickhouse-schema';

export const TRACE_ROLLUP_TABLE_NAME = 'trace_rollup';

const schemaDefinition = {
  date: { type: CHDate() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  workflow_id: { type: CHString() },
  external_subscriber_id: { type: CHString() },
  event_type: { type: CHLowCardinality(CHString()) },
  provider_id: { type: CHString() },
  count: { type: CHUInt64() },
};

export const TRACE_ROLLUP_ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'event_type',
  'date',
  'workflow_id',
  'external_subscriber_id',
  'provider_id',
];

const clickhouseSchemaOptions = {
  table_name: TRACE_ROLLUP_TABLE_NAME,
  engine: 'SummingMergeTree',
  order_by: `(${TRACE_ROLLUP_ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(date)'],
};

export const traceRollupSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type TraceRollup = {
  date: string;
  organization_id: string;
  environment_id: string;
  workflow_id: string;
  external_subscriber_id: string;
  event_type: string;
  provider_id: string;
  count: number;
};

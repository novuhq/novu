import { CHDate, CHString, CHUInt64, ClickhouseSchema } from 'clickhouse-schema';

export const TRACE_EVENT_COUNTS_TABLE_NAME = 'trace_event_counts';

const schemaDefinition = {
  date: { type: CHDate() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  workflow_id: { type: CHString() },
  count: { type: CHUInt64() },
};

export const TRACE_EVENT_COUNTS_ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'workflow_id',
  'date',
];

const clickhouseSchemaOptions = {
  table_name: TRACE_EVENT_COUNTS_TABLE_NAME,
  engine: 'SummingMergeTree',
  order_by: `(${TRACE_EVENT_COUNTS_ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(date)'],
};

export const traceEventCountsSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type TraceEventCount = {
  date: string;
  organization_id: string;
  environment_id: string;
  workflow_id: string;
  count: number;
};

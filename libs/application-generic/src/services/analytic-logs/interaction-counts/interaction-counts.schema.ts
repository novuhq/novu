import { CHDate, CHLowCardinality, CHString, CHUInt64, ClickhouseSchema } from 'clickhouse-schema';

export const INTERACTION_COUNTS_TABLE_NAME = 'interaction_counts';

const schemaDefinition = {
  date: { type: CHDate() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  workflow_id: { type: CHString() },
  event_type: { type: CHLowCardinality(CHString()) },
  count: { type: CHUInt64() },
};

export const INTERACTION_COUNTS_ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'date',
  'workflow_id',
  'event_type',
];

const clickhouseSchemaOptions = {
  table_name: INTERACTION_COUNTS_TABLE_NAME,
  engine: 'SummingMergeTree',
  order_by: `(${INTERACTION_COUNTS_ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(date)'],
};

export const interactionCountsSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type InteractionCount = {
  date: string;
  organization_id: string;
  environment_id: string;
  workflow_id: string;
  event_type: string;
  count: number;
};

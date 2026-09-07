import { CHDate, CHLowCardinality, CHString, CHUInt64, ClickhouseSchema } from 'clickhouse-schema';

export const DELIVERY_TREND_COUNTS_TABLE_NAME = 'delivery_trend_counts';

const schemaDefinition = {
  date: { type: CHDate() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  workflow_id: { type: CHString() },
  step_type: { type: CHLowCardinality(CHString()) },
  count: { type: CHUInt64() },
  expires_at: { type: CHDate() },
};

export const DELIVERY_TREND_COUNTS_ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'date',
  'workflow_id',
  'step_type',
];

const clickhouseSchemaOptions = {
  table_name: DELIVERY_TREND_COUNTS_TABLE_NAME,
  engine: 'SummingMergeTree',
  order_by: `(${DELIVERY_TREND_COUNTS_ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(date)', 'TTL expires_at'],
};

export const deliveryTrendCountsSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type DeliveryTrendCount = {
  date: string;
  organization_id: string;
  environment_id: string;
  workflow_id: string;
  step_type: string;
  count: number;
  expires_at: string;
};

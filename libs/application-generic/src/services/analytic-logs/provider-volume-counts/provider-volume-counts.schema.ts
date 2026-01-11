import { CHDate, CHString, CHUInt64, ClickhouseSchema } from 'clickhouse-schema';

export const PROVIDER_VOLUME_COUNTS_TABLE_NAME = 'provider_volume_counts';

const schemaDefinition = {
  date: { type: CHDate() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  workflow_id: { type: CHString() },
  provider_id: { type: CHString() },
  count: { type: CHUInt64() },
};

export const PROVIDER_VOLUME_COUNTS_ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'date',
  'workflow_id',
  'provider_id',
];

const clickhouseSchemaOptions = {
  table_name: PROVIDER_VOLUME_COUNTS_TABLE_NAME,
  engine: 'SummingMergeTree',
  order_by: `(${PROVIDER_VOLUME_COUNTS_ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(date)'],
};

export const providerVolumeCountsSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type ProviderVolumeCount = {
  date: string;
  organization_id: string;
  environment_id: string;
  workflow_id: string;
  provider_id: string;
  count: number;
};

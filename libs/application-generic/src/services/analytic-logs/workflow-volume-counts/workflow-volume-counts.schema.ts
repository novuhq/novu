import { CHDate, CHString, CHUInt64, ClickhouseSchema } from 'clickhouse-schema';

export const WORKFLOW_VOLUME_COUNTS_TABLE_NAME = 'workflow_volume_counts';

const schemaDefinition = {
  date: { type: CHDate() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  workflow_id: { type: CHString() },
  workflow_name: { type: CHString() },
  count: { type: CHUInt64() },
};

export const WORKFLOW_VOLUME_COUNTS_ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'date',
  'workflow_id',
  'workflow_name',
];

const clickhouseSchemaOptions = {
  table_name: WORKFLOW_VOLUME_COUNTS_TABLE_NAME,
  engine: 'SummingMergeTree',
  order_by: `(${WORKFLOW_VOLUME_COUNTS_ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(date)'],
};

export const workflowVolumeCountsSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type WorkflowVolumeCount = {
  date: string;
  organization_id: string;
  environment_id: string;
  workflow_id: string;
  workflow_name: string;
  count: number;
};

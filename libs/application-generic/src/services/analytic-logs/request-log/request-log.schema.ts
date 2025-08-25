import {
  CHDateTime64,
  CHLowCardinality,
  CHString,
  CHUInt16,
  CHUInt32,
  ClickhouseSchema,
  InferClickhouseSchemaType,
} from 'clickhouse-schema';
import { Prettify } from '../../../utils/prettify.type';

export const TABLE_NAME = 'requests';

const schemaDefinition = {
  id: { type: CHString() },
  created_at: { type: CHDateTime64(3, 'UTC') },
  path: { type: CHString() },
  url: { type: CHString() },
  url_pattern: { type: CHString() },
  hostname: { type: CHString() },
  status_code: { type: CHUInt16() },
  method: { type: CHLowCardinality(CHString()) },
  transaction_id: { type: CHString() },
  ip: { type: CHString() },
  user_agent: { type: CHString() },
  request_body: { type: CHString() },
  response_body: { type: CHString() },
  user_id: { type: CHString() },
  organization_id: { type: CHString() },
  environment_id: { type: CHString() },
  auth_type: { type: CHString() },
  duration_ms: { type: CHUInt32() },
  expires_at: { type: CHDateTime64(3, 'UTC') },
};

export const ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'transaction_id',
  'created_at',
];

export const TTL: keyof typeof schemaDefinition = 'expires_at';

const clickhouseSchemaOptions = {
  table_name: TABLE_NAME,
  engine: 'MergeTree',
  order_by: `(${ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(created_at)', `TTL toDateTime(${TTL})`],
};

export const requestLogSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type RequestLogComplex = InferClickhouseSchemaType<typeof requestLogSchema>;

export type RequestLog = Prettify<RequestLogComplex>;

import {
  ClickhouseSchema,
  InferClickhouseSchemaType,
  CHUInt16,
  CHString,
  CHDateTime64,
  CHLowCardinality,
  CHNullable,
  CHUInt32,
} from 'clickhouse-schema';
import { TABLE_NAME } from './request-log.repository';

export const requestLogSchema = new ClickhouseSchema(
  {
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
  },
  {
    order_by: 'ORDER_BY_X_LIST' as any,
    table_name: TABLE_NAME,
    engine: 'MergeTree',
  }
);

export const ORDER_BY: (keyof typeof requestLogSchema.schema)[] = [
  'organization_id',
  'environment_id',
  'transaction_id',
  'created_at',
];

export type RequestLog = InferClickhouseSchemaType<typeof requestLogSchema>;

import {
  ClickhouseSchema,
  InferClickhouseSchemaType,
  CHUInt16,
  CHString,
  CHDateTime,
  CHLowCardinality,
  CHNullable,
  CHUInt32,
} from 'clickhouse-schema';
import { TABLE_NAME } from './http-log.repository';

export const httpLogSchema = new ClickhouseSchema(
  {
    timestamp: { type: CHDateTime('UTC') },
    path: { type: CHString() },
    url: { type: CHString() },
    hostname: { type: CHString() },
    status_code: { type: CHUInt16() },
    method: { type: CHLowCardinality(CHString()) },
    transaction_id: {
      type: CHNullable(CHString()),
    },
    ip: { type: CHString() },
    user_agent: { type: CHString() },
    query_params: { type: CHString() },
    request_body: { type: CHString() },
    response_body: { type: CHString() },
    user_id: { type: CHString() },
    organization_id: { type: CHString() },
    environment_id: { type: CHString() },
    schema_type: { type: CHString() },
    duration_ms: { type: CHUInt32() },
  },
  {
    table_name: TABLE_NAME,
  }
);

export type HttpLog = InferClickhouseSchemaType<typeof httpLogSchema>;

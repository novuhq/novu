import {
  CHNullable,
  CHString,
  CHDateTime64,
  CHLowCardinality,
  ClickhouseSchema,
  InferClickhouseSchemaType,
} from 'clickhouse-schema';

export const TABLE_NAME = 'traces';

export const traceLogSchema = new ClickhouseSchema(
  {
    id: { type: CHString() },
    created_at: { type: CHDateTime64(3, 'UTC') },

    // Context
    organization_id: { type: CHString() },
    environment_id: { type: CHString() },
    user_id: { type: CHNullable(CHString()) },
    external_subscriber_id: { type: CHNullable(CHString()) },
    subscriber_id: { type: CHNullable(CHString()) },

    // Trace metadata
    event_type: { type: CHLowCardinality(CHString()) }, // e.g., "message:seen", "step_run:start", "step_run:end"
    title: { type: CHString() }, // Human readable message
    message: { type: CHNullable(CHString()) },
    raw_data: { type: CHNullable(CHString()) },

    status: { type: CHLowCardinality(CHString()) }, // success, error, timeout

    // Correlation, Hierarchy context
    entity_type: { type: CHLowCardinality(CHString()) }, // request, workflow_run, step_run
    entity_id: { type: CHString() }, // ID of the related entity

    // Data retention
    expires_at: { type: CHDateTime64(3, 'UTC') },
  },
  {
    order_by: 'ORDER_BY_X_LIST' as any,
    table_name: TABLE_NAME,
    engine: 'MergeTree',
  }
);

export const ORDER_BY: (keyof typeof traceLogSchema.schema)[] = [
  'entity_type',
  'organization_id',
  'entity_id',
  'created_at',
];

export type Trace = InferClickhouseSchemaType<typeof traceLogSchema>;

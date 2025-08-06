import {
  CHDateTime64,
  CHLowCardinality,
  CHNullable,
  CHString,
  ClickhouseSchema,
  InferClickhouseSchemaType,
} from 'clickhouse-schema';
import { Prettify } from '../../../utils/prettify.type';

export const TABLE_NAME = 'traces';

const schemaDefinition = {
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
};

export const ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'entity_type',
  'organization_id',
  'entity_id',
  'created_at',
];

export const TTL: keyof typeof schemaDefinition = 'expires_at';

const clickhouseSchemaOptions = {
  table_name: TABLE_NAME,
  engine: 'MergeTree',
  order_by: `(${ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(created_at)', `TTL toDateTime(${TTL})`],
};

export const traceLogSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type EventType =
  | 'message_seen'
  | 'message_unseen'
  | 'message_read'
  | 'message_unread'
  | 'message_archived'
  | 'message_unarchived'
  | 'message_snoozed'
  | 'message_unsnoozed'
  | 'step_created'
  | 'step_queued'
  | 'step_delayed'
  | 'step_digested'
  | 'step_filtered'
  | 'step_filter_processing'
  | 'step_filter_failed'
  | 'message_created'
  | 'message_sent'
  | 'message_snoozed'
  | 'message_unsnoozed'
  | 'message_unsnooze_failed'
  | 'message_content_failed'
  | 'message_sending_started'
  | 'subscriber_integration_missing'
  | 'subscriber_channel_missing'
  | 'subscriber_validation_failed'
  | 'provider_error'
  | 'provider_limit_exceeded'
  | 'digest_merged'
  | 'digest_skipped'
  | 'digest_triggered'
  | 'digest_started'
  | 'delay_completed'
  | 'delay_misconfigured'
  | 'delay_limit_exceeded'
  | 'bridge_response_received'
  | 'bridge_execution_failed'
  | 'bridge_execution_skipped'
  | 'webhook_filter_retrying'
  | 'webhook_filter_failed'
  | 'integration_selected'
  | 'layout_not_found'
  | 'layout_selected'
  | 'tenant_selected'
  | 'tenant_not_found'
  | 'variant_selected'
  | 'notification_error'
  | 'chat_webhook_missing'
  | 'chat_all_channels_failed'
  | 'chat_phone_missing'
  | 'chat_some_channels_skipped'
  | 'push_tokens_missing'
  | 'push_some_channels_skipped'
  | 'subscriber_missing_email_address'
  | 'subscriber_missing_phone_number'
  | 'reply_callback_missing'
  | 'reply_callback_misconfigured'
  | 'reply_mx_record_missing'
  | 'reply_mx_domain_missing'
  | 'execution_detail'
  | 'step_completed';

export type EntityType = 'request' | 'step_run';

type NativeTrace = InferClickhouseSchemaType<typeof traceLogSchema>;

export type TraceLogComplex = Omit<NativeTrace, 'event_type' | 'entity_type'> & {
  event_type: EventType;
  entity_type: EntityType;
};

export type Trace = Prettify<TraceLogComplex>;

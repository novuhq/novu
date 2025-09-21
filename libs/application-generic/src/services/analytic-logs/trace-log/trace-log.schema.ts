import {
  CHArray,
  CHDateTime64,
  CHLowCardinality,
  CHNullable,
  CHString,
  ClickhouseSchema,
  InferClickhouseSchemaType,
} from 'clickhouse-schema';
import { Prettify } from '../../../utils/prettify.type';
import { StepType } from '..';

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

  status: { type: CHLowCardinality(CHString()) },

  // Correlation, Hierarchy context
  entity_type: { type: CHLowCardinality(CHString()) }, // request, step_run
  entity_id: { type: CHString() }, // ID of the related entity, request-> request.id, step_run-> job._id

  // Data retention
  expires_at: { type: CHDateTime64(3, 'UTC') },

  // Step run metadata
  step_run_type: { type: CHString('') }, // default value is empty string

  // Workflow run metadata
  workflow_run_identifier: { type: CHString('') }, // default value is empty string
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
  | 'message_clicked'
  | 'message_read'
  | 'message_unread'
  | 'message_archived'
  | 'message_unarchived'
  | 'message_snoozed'
  | 'message_unsnoozed'
  | 'message_created'
  | 'message_sent'
  | 'message_spam'
  | 'message_bounced'
  | 'message_dropped'
  | 'message_deferred'
  | 'message_unsubscribed'
  | 'message_delayed'
  | 'message_deleted'
  | 'message_complaint'
  | 'message_delivered'
  | 'message_rejected'
  | 'message_blocked'
  | 'message_snoozed'
  | 'message_unsnoozed'
  | 'message_unsnooze_failed'
  | 'message_content_failed'
  | 'message_sending_started'
  | 'message_severity_overridden'
  | 'step_created'
  | 'step_queued'
  | 'step_delayed'
  | 'step_digested'
  | 'step_filtered'
  | 'step_filter_processing'
  | 'step_filter_failed'
  | 'subscriber_integration_missing'
  | 'subscriber_channel_missing'
  | 'subscriber_validation_failed'
  | 'topic_not_found'
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
  | 'chat_webhook_missing'
  | 'chat_all_channels_failed'
  | 'chat_phone_missing'
  | 'push_tokens_missing'
  | 'chat_some_channels_skipped'
  | 'push_tokens_missing'
  | 'push_some_channels_skipped'
  | 'subscriber_missing_email_address'
  | 'subscriber_missing_phone_number'
  | 'reply_callback_missing'
  | 'reply_callback_misconfigured'
  | 'reply_mx_record_missing'
  | 'reply_mx_domain_missing'
  | 'variant_selected'
  | 'notification_error'
  | 'execution_detail'
  | 'step_completed'
  | 'request_received'
  | 'request_queued'
  | 'request_failed'
  | 'request_organization_not_found'
  | 'request_environment_not_found'
  | 'request_workflow_not_found'
  | 'request_invalid_recipients'
  | 'request_payload_validation_failed'
  | 'request_subscriber_processing_completed'
  | 'workflow_execution_started'
  | 'workflow_environment_not_found'
  | 'workflow_template_not_found'
  | 'workflow_template_found'
  | 'workflow_tenant_processing_started'
  | 'workflow_tenant_processing_failed'
  | 'workflow_tenant_processing_completed'
  | 'workflow_actor_processing_started'
  | 'workflow_actor_processing_failed'
  | 'workflow_actor_processing_completed'
  | 'workflow_context_resolution_failed'
  | 'workflow_context_resolution_completed'
  | 'workflow_context_not_found'
  | 'workflow_execution_failed'
  | 'step_skipped'
  | 'step_skipped_outside_of_the_schedule'
  | 'step_extended_to_schedule'
  | 'step_skipped_max_extensions_reached';

export type EntityType = 'request' | 'step_run';

export type TraceStatus = 'success' | 'error' | 'warning' | 'pending';

type NativeTrace = InferClickhouseSchemaType<typeof traceLogSchema>;

export type TraceLogComplex = Omit<NativeTrace, 'event_type' | 'entity_type' | 'status' | 'step_run_type'> & {
  event_type: EventType;
  entity_type: EntityType;
  status: TraceStatus;
  step_run_type?: StepType;
};

export type Trace = Prettify<TraceLogComplex>;

import { DeliveryLifecycleEventType } from '@novu/shared';
import {
  CHArray,
  CHBoolean,
  CHDateTime64,
  CHLowCardinality,
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
  user_id: { type: CHString('') },
  external_subscriber_id: { type: CHString('') },
  subscriber_id: { type: CHString('') },

  // Trace metadata
  event_type: { type: CHLowCardinality(CHString()) }, // e.g., "message:seen", "step_run:start", "step_run:end"
  title: { type: CHString() }, // Human readable message
  message: { type: CHString('') },
  raw_data: { type: CHString('') },

  status: { type: CHLowCardinality(CHString()) },

  // Correlation, Hierarchy context
  entity_type: { type: CHLowCardinality(CHString()) },
  entity_id: { type: CHString() }, // ID of the related entity, request-> request.id, step_run-> job._id, workflow_run-> notification._id

  // Data retention
  expires_at: { type: CHDateTime64(3, 'UTC') },

  // Step run metadata
  step_run_type: { type: CHString('') }, // default value is empty string

  // Workflow run metadata
  workflow_run_identifier: { type: CHString('') }, // default value is empty string
  workflow_id: { type: CHString('') }, // Maps to NotificationTemplateEntity._id

  // Provider metadata
  provider_id: { type: CHString('') },

  // Workflow run columns (14 new columns)
  workflow_name: { type: CHString('') },
  transaction_id: { type: CHString('') },
  channels: { type: CHString('') }, // JSON array of channels
  subscriber_to: { type: CHString('') }, // JSON representation of the 'to' field
  payload: { type: CHString('') }, // JSON representation of the payload
  control_values: { type: CHString('') }, // JSON representation of controls
  topics: { type: CHString('') }, // JSON array of topics
  is_digest: { type: CHBoolean(false) },
  digested_workflow_run_id: { type: CHString('') }, // Reference to parent digest if this is a digested notification
  delivery_lifecycle_status: { type: CHLowCardinality(CHString('')) },
  delivery_lifecycle_detail: { type: CHLowCardinality(CHString('')) },
  severity: { type: CHLowCardinality(CHString('')) },
  critical: { type: CHBoolean(false) },
  context_keys: { type: CHArray(CHString(), []) },
};

export const ORDER_BY: (keyof typeof schemaDefinition)[] = [
  'organization_id',
  'environment_id',
  'entity_type',
  'created_at',
  'entity_id',
];

export const TTL: keyof typeof schemaDefinition = 'expires_at';

const clickhouseSchemaOptions = {
  table_name: TABLE_NAME,
  engine: 'MergeTree',
  order_by: `(${ORDER_BY.join(', ')})` as any,
  additional_options: ['PARTITION BY toYYYYMM(created_at)', `TTL toDateTime(${TTL})`],
};

export const traceLogSchema = new ClickhouseSchema(schemaDefinition, clickhouseSchemaOptions);

export type WorkflowRunStatusType =
  | 'workflow_run_status_processing'
  | 'workflow_run_status_completed'
  | 'workflow_run_status_error';

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
  | 'subscriber_context_channel_missing'
  | 'subscriber_validation_failed'
  | 'topic_not_found'
  | 'provider_missing'
  | 'provider_error'
  | 'provider_limit_exceeded'
  | 'digest_merged'
  | 'digest_skipped'
  | 'digest_triggered'
  | 'digest_started'
  | 'delay_completed'
  | 'delay_misconfigured'
  | 'delay_limit_exceeded'
  | 'step_throttled'
  | 'throttle_limit_exceeded'
  | 'throttle_window_in_past'
  | 'bridge_response_received'
  | 'bridge_execution_failed'
  | 'step_resolver_execution_failed'
  | 'step_resolver_execution_timeout'
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
  | 'msteams_bot_not_installed'
  | 'msteams_channel_not_found'
  | 'msteams_user_not_found'
  | 'msteams_insufficient_permissions'
  | 'msteams_tenant_not_consented'
  | 'msteams_invalid_credentials'
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
  | 'step_processed'
  | 'step_canceled'
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
  | 'workflow_execution_failed'
  | 'step_skipped'
  | 'step_skipped_outside_of_the_schedule'
  | 'step_extended_to_schedule'
  | 'step_skipped_max_extensions_reached'
  | 'push_invalid_token_removed'
  | 'topic_subscription_preference_evaluation'
  | 'action_step_execution_failed'
  | WorkflowRunStatusType
  | DeliveryLifecycleEventType;

export type EntityType = 'request' | 'step_run' | 'workflow_run';

export type TraceStatus = 'success' | 'error' | 'warning' | 'pending' | '';

type NativeTrace = InferClickhouseSchemaType<typeof traceLogSchema>;

export type TraceLogComplex = Omit<NativeTrace, 'event_type' | 'entity_type' | 'status' | 'step_run_type'> & {
  event_type: EventType;
  entity_type: EntityType;
  status: TraceStatus;
  step_run_type: StepType;
};

export type Trace = Prettify<TraceLogComplex>;

type AutoGeneratedFields = keyof Pick<Trace, 'id' | 'expires_at' | 'entity_type'>;

type WorkflowRunExclusiveFields = keyof Pick<
  Trace,
  | 'workflow_name'
  | 'transaction_id'
  | 'channels'
  | 'subscriber_to'
  | 'payload'
  | 'control_values'
  | 'topics'
  | 'is_digest'
  | 'digested_workflow_run_id'
  | 'delivery_lifecycle_status'
  | 'delivery_lifecycle_detail'
  | 'severity'
  | 'critical'
  | 'context_keys'
>;

type StepRunExclusiveFields = keyof Pick<Trace, 'step_run_type'>;

export type RequestTraceInput = Prettify<
  Omit<Trace, AutoGeneratedFields | WorkflowRunExclusiveFields | StepRunExclusiveFields>
>;

export type StepRunTraceInput = Prettify<Omit<Trace, AutoGeneratedFields | WorkflowRunExclusiveFields>>;

export type WorkflowRunTraceInput = Prettify<Omit<Trace, AutoGeneratedFields | StepRunExclusiveFields>>;

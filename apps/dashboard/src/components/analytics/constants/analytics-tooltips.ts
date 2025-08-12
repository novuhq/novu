/**
 * Available trace events from trace-log.repository.ts:
 *
 * MESSAGE EVENTS:
 * - message_created, message_sent, message_seen, message_unseen
 * - message_read, message_unread, message_archived, message_unarchived
 * - message_snoozed, message_unsnoozed, message_unsnooze_failed
 * - message_content_failed, message_sending_started
 *
 * STEP EVENTS:
 * - step_created, step_queued, step_delayed, step_digested
 * - step_filtered, step_filter_processing, step_filter_failed, step_completed
 *
 * WORKFLOW EVENTS:
 * - workflow_execution_started, workflow_environment_not_found, workflow_template_not_found
 * - workflow_template_found, workflow_tenant_processing_started/failed/completed
 * - workflow_actor_processing_started/completed/failed, workflow_execution_failed
 *
 * SUBSCRIBER EVENTS:
 * - subscriber_integration_missing, subscriber_channel_missing, subscriber_validation_failed
 * - subscriber_missing_email_address, subscriber_missing_phone_number
 *
 * REQUEST EVENTS:
 * - request_received, request_queued, request_failed, request_organization_not_found
 * - request_environment_not_found, request_workflow_not_found, request_invalid_recipients
 * - request_payload_validation_failed, request_subscriber_processing_completed
 *
 * PROVIDER/INTEGRATION EVENTS:
 * - provider_error, provider_limit_exceeded, integration_selected
 *
 * DIGEST EVENTS:
 * - digest_merged, digest_skipped, digest_triggered, digest_started
 *
 * DELAY EVENTS:
 * - delay_completed, delay_misconfigured, delay_limit_exceeded
 *
 * BRIDGE EVENTS:
 * - bridge_response_received, bridge_execution_failed, bridge_execution_skipped
 *
 * WEBHOOK EVENTS:
 * - webhook_filter_retrying, webhook_filter_failed
 *
 * CHANNEL-SPECIFIC EVENTS:
 * - chat_webhook_missing, chat_all_channels_failed, chat_phone_missing, chat_some_channels_skipped
 * - push_tokens_missing, push_some_channels_skipped
 * - reply_callback_missing, reply_callback_misconfigured, reply_mx_record_missing, reply_mx_domain_missing
 *
 * OTHER EVENTS:
 * - layout_not_found, layout_selected, tenant_selected, tenant_not_found
 * - variant_selected, notification_error, execution_detail, topic_not_found
 *
 * CURRENTLY TRACKED IN ANALYTICS:
 * - Interaction Trend: message_sent, message_seen, message_read, message_snoozed
 * - Total Interactions: message_seen, message_read, message_snoozed, message_archived
 */
export const ANALYTICS_TOOLTIPS = {
  MESSAGES_DELIVERED:
    'Shows the total number of messages generated across all channels (Email, SMS, Push, In-App) during the selected time period.',

  ACTIVE_SUBSCRIBERS:
    'Displays the count of unique subscribers who have received at least one message during the selected time period.',

  INTERACTIONS:
    'Shows total user interactions with messages:\n\n• Message seen\n• Message read\n• Message snoozed\n• Message archived\n\nTracks engagement across in-app notifications with more channels coming soon.',

  AVG_MESSAGES_PER_SUBSCRIBER:
    'Calculates the average number of messages sent per  subscriber during the selected time period.',

  DELIVERY_TREND:
    'Visualizes daily delivery volume breakdown by channel:\n\n• Email\n• SMS\n• Push\n• In-App\n\nShows trends over the selected time period.',

  INTERACTION_TREND:
    'Shows daily interaction patterns over time:\n\n• Message sent\n• Message seen\n• Message read\n• Message snoozed\n\nVisualizes user engagement trends with your notifications.',

  TOP_WORKFLOWS_BY_VOLUME:
    'Displays the workflows with the highest message volume, showing which notification templates are most actively used.',

  WORKFLOW_RUNS_TREND:
    'Tracks workflow execution patterns over time, showing how notification triggers and automated sequences perform.',

  ACTIVE_SUBSCRIBERS_TREND:
    'Visualizes the growth or decline of your active subscriber base over the selected time period.',

  PROVIDERS_BY_VOLUME:
    'Shows message distribution across different notification providers (SendGrid, Twilio, Firebase, etc.) by volume.',
} as const;

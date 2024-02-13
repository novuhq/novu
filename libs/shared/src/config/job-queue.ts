/**
 * WARNING:
 * DO NOT CHANGE THE VALUES OF THIS ENUM WITHOUT HAVING AN APPROPRIATE MIGRATION PLAN IN PLACE.
 * THE VALUES CORRESPONDING TO QUEUE NAMES AND CHANGING THEM WILL BREAK THE SYSTEM RESULTING
 * IN STALLED JOBS IN THE QUEUE.
 */
export enum JobTopicNameEnum {
  EXECUTION_LOG = 'execution-logs',
  ACTIVE_JOBS_METRIC = 'metric-active-jobs',
  INBOUND_PARSE_MAIL = 'inbound-parse-mail',
  STANDARD = 'standard',
  WEB_SOCKETS = 'ws_socket_queue',
  WORKFLOW = 'trigger-handler',
  PROCESS_SUBSCRIBER = 'process-subscriber',
}

export enum ObservabilityBackgroundTransactionEnum {
  JOB_PROCESSING_QUEUE = 'job-processing-queue',
  SUBSCRIBER_PROCESSING_QUEUE = 'subscriber-processing-queue',
  TRIGGER_HANDLER_QUEUE = 'trigger-handler-queue',
  EXECUTION_LOG_QUEUE = 'execution-log-queue',
  WS_SOCKET_QUEUE = 'ws_socket_queue',
  WS_SOCKET_SOCKET_CONNECTION = 'ws_socket_handle_connection',
  WS_SOCKET_HANDLE_DISCONNECT = 'ws_socket_handle_disconnect',
  CRON_JOB_QUEUE = 'cron-job-queue',
}

export enum JobCronNameEnum {
  SEND_CRON_METRICS = 'send-cron-metrics',
  CREATE_BILLING_USAGE_RECORDS = 'create-billing-usage-records',
}

export enum JobTopicNameEnum {
  EXECUTION_LOG = 'execution-log',
  ACTIVE_JOBS_METRIC = 'metric-active-jobs',
  INBOUND_PARSE_MAIL = 'inbound-parse-mail',
  STANDARD = 'standard',
  WEB_SOCKETS = 'ws_socket_queue',
  WORKFLOW = 'trigger-handler',
  PROCESS_SUBSCRIBER = 'process-subscriber',
}

/*
 * Name need to be in sync with the enum above as
 * the name should be `EnumString-queue` for any queue name enums
 */
export enum ObservabilityBackgroundTransactionEnum {
  JOB_PROCESSING_QUEUE = 'job-processing-queue',
  SUBSCRIBER_PROCESSING_QUEUE = 'subscriber-processing-queue',
  TRIGGER_HANDLER_QUEUE = 'trigger-handler-queue',
  EXECUTION_LOG_QUEUE = 'execution-log-queue',
  WS_SOCKET_QUEUE = 'ws_socket_queue',
  WS_SOCKET_SOCKET_CONNECTION = 'ws_socket_handle_connection',
  WS_SOCKET_HANDLE_DISCONNECT = 'ws_socket_handle_disconnect',
}

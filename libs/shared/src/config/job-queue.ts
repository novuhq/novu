export enum JobTopicNameEnum {
  INBOUND_PARSE_MAIL = 'inbound-parse-mail',
  METRICS = 'metric',
  STANDARD = 'standard',
  WEB_SOCKETS = 'ws_socket_queue',
  WORKFLOW = 'trigger-handler',
  EXECUTION_DETAIL_ARCHIVE = 'execution-details-archive',
}

export enum ObservabilityBackgroundTransactionEnum {
  JOB_PROCESSING_QUEUE = 'job-processing-queue',
  TRIGGER_HANDLER_QUEUE = 'trigger-handler-queue',
}

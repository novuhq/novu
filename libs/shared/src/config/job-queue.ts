export enum JobTopicNameEnum {
  INBOUND_PARSE_MAIL = 'inbound-parse-mail',
  METRICS = 'metric',
  STANDARD = 'standard',
  WEB_SOCKETS = 'ws_socket_queue',
  WORKFLOW = 'trigger-handler',
  SUBSCRIBER_PROCESS = 'subscriber-process',
}

export enum ObservabilityBackgroundTransactionEnum {
  TRIGGER_HANDLER_QUEUE = 'trigger-handler-queue',
  JOB_PROCESSING_QUEUE = 'job-processing-queue',
  SUBSCRIBER_PROCESSING_QUEUE = 'subscriber-processing-queue',
}

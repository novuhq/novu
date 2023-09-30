export enum ExecutionDetailsSourceEnum {
  CREDENTIALS = 'Credentials',
  INTERNAL = 'Internal',
  PAYLOAD = 'Payload',
  WEBHOOK = 'Webhook',
}

export enum ExecutionDetailsStatusEnum {
  SUCCESS = 'Success',
  WARNING = 'Warning',
  FAILED = 'Failed',
  PENDING = 'Pending',
  QUEUED = 'Queued',
  READ_CONFIRMATION = 'ReadConfirmation',
}

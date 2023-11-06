export enum JobStatusEnum {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  CANCELED = 'canceled',
  MERGED = 'merged',
  SKIPPED = 'skipped',
}

export enum DigestCreationResultEnum {
  MERGED = 'MERGED',
  CREATED = 'CREATED',
  SKIPPED = 'SKIPPED',
}

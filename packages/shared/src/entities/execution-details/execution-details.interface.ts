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

export interface IExecutionDetail {
  _id: string;
  _jobId: string;
  providerId: string;
  detail: string;
  source: ExecutionDetailsSourceEnum;
  status: ExecutionDetailsStatusEnum;
  isTest: boolean;
  isRetry: boolean;
  raw?: string;
  createdAt: string;
  updatedAt: string;
  id: string;
}

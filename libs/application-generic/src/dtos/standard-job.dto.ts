import { IJobParams } from '../services/queues/queue-base.service';

export class IStandardDataDto {
  _userId: string;
  _environmentId: string;
  _organizationId: string;
  _id: string;
  /*
   * skipProcessing flag for CF Scheduler migration
   * When true, the consumer should skip processing this job
   * Used in LIVE mode where BullMQ job is shadow and CF Scheduler result is real
   * Used by API when CF Scheduler calls in SHADOW mode (BullMQ is real)
   */
  skipProcessing?: boolean;
  /*
   * payload is deprecated - todo remove 'payload' once the queue renewed
   * payload was added due backwards compatibility, the legacy use is in standard-worker
   */
  payload?: {
    message: {
      _jobId: string;
      _environmentId: string;
      _organizationId: string;
    };
  };
}

export interface IStandardJobDto extends IJobParams {
  data?: IStandardDataDto;
}

export interface IStandardBulkJobDto extends IJobParams {
  data: IStandardDataDto;
}

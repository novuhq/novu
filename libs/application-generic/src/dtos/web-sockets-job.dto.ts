import { WebSocketEventEnum } from '@novu/shared';
import { JobsOptions } from '../services/bull-mq';
import { IBulkJobParams, IJobParams } from '../services/queues/queue-base.service';

export interface IWebSocketDataDto {
  event: WebSocketEventEnum;
  userId: string;
  _environmentId: string;
  _organizationId?: string;
  subscriberId?: string;
  payload?: { messageId: string };
}

export interface IWebSocketJob extends IJobParams {
  name: string;
  data: any;
  groupId?: string;
  options?: JobsOptions;
}

export interface IWebSocketJobDto extends IWebSocketJob {
  data: IWebSocketDataDto;
}

export interface IWebSocketBulkJobDto extends IBulkJobParams {
  data: IWebSocketDataDto;
}

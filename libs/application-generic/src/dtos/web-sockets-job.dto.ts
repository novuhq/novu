import { WebSocketEventEnum } from '@novu/shared';
import { JobsOptions } from '../services/bull-mq';
import { IBulkJobParams, IJobParams } from '../services/queues/queue-base.service';

export interface IWebSocketDataDto {
  event: WebSocketEventEnum;
  userId: string;
  _environmentId: string;
  _organizationId?: string;
  subscriberId?: string;
  /**
   * Inbox jobs use `{ messageId }` (and related count fields).
   * `AGENT_EVENT` jobs carry an `AgentEventEnvelope`.
   */
  payload?: Record<string, unknown>;
  contextKeys: string[];
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

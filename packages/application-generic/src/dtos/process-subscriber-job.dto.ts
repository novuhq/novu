import {
  ISubscribersDefine,
  ITenantDefine,
  SubscriberSourceEnum,
} from '@novu/shared';
import { SubscriberEntity } from '@novu/dal';

import {
  IBulkJobParams,
  IJobParams,
} from '../services/queues/queue-base.service';

export interface IProcessSubscriberDataDto {
  environmentId: string;
  organizationId: string;
  userId: string;
  transactionId: string;
  identifier: string;
  payload: any;
  overrides: Record<string, Record<string, unknown>>;
  tenant?: ITenantDefine;
  actor?: SubscriberEntity;
  subscriber: ISubscribersDefine;
  templateId: string;
  _subscriberSource: SubscriberSourceEnum;
}

export interface IProcessSubscriberJobDto extends IJobParams {
  data?: IProcessSubscriberDataDto;
}

export interface IProcessSubscriberBulkJobDto extends IBulkJobParams {
  data: IProcessSubscriberDataDto;
}

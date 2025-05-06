import { ChannelTypeEnum } from '../../types';
import { IExecutionDetail } from '../execution-details';
import { IJob as IJobBase } from '../job';
import { INotificationTemplate } from '../notification-template';
import { ISubscriber } from '../subscriber';

export interface IActivityJob extends IJobBase {
  executionDetails: IExecutionDetail[];
}

export interface IActivity {
  _id: string;
  _templateId: string;
  _environmentId: string;
  _organizationId: string;
  _subscriberId: string;
  _digestedNotificationId?: string;
  transactionId: string;
  channels: ChannelTypeEnum[];
  to: {
    subscriberId: string;
  };
  payload: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  template?: Pick<INotificationTemplate, '_id' | 'name' | 'triggers' | 'origin'>;
  subscriber?: Pick<ISubscriber, '_id' | 'subscriberId' | 'firstName' | 'lastName'>;
  jobs: IActivityJob[];
}

import { SeverityLevelEnum } from '../../consts';
import { ChannelTypeEnum, ISubscriber } from '../../types';
import { IExecutionDetail } from '../execution-details';
import { IJob as IJobBase } from '../job';
import { INotificationTemplate } from '../notification-template';
import { IMessageCTA } from '@novu/shared';

export interface IActivityJob extends IJobBase {
  executionDetails: IExecutionDetail[];
  preview?: {
    subject?: string;
    content?: string;
    title?: string;
    preheader?: string;
    senderName?: string;
    cta?: IMessageCTA;
  };
}

export interface IActivity {
  _id: string;
  _templateId: string;
  _environmentId: string;
  _organizationId: string;
  _subscriberId: string;
  _digestedNotificationId?: string;
  topics?: { _topicId: string; topicKey: string }[];
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
  severity?: SeverityLevelEnum;
  critical?: boolean;
  contextKeys?: string[];
}

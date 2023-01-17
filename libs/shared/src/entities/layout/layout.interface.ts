import { EnvironmentId, LayoutDescription, LayoutId, LayoutName, OrganizationId, UserId } from '../../types';
import { ChannelTypeEnum, ITemplateVariable } from '../message-template';

export interface ILayoutEntity {
  _id?: LayoutId;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  _creatorId: UserId;
  name: LayoutName;
  channel: ChannelTypeEnum;
  content: string;
  description?: LayoutDescription;
  contentType: string;
  variables?: ITemplateVariable[];
  isDefault: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

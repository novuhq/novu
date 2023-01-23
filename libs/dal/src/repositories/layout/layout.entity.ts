import {
  ChannelTypeEnum,
  EnvironmentId,
  ITemplateVariable,
  OrganizationId,
  LayoutDescription,
  LayoutId,
  LayoutName,
  UserId,
} from './types';

export class LayoutEntity {
  _id: LayoutId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _creatorId: UserId;
  _parentId?: LayoutId;
  name: LayoutName;
  description?: LayoutDescription;
  variables?: ITemplateVariable[];
  content: string;
  contentType: 'customHtml';
  isDefault: boolean;
  deleted: boolean;
  channel: ChannelTypeEnum;
  createdAt?: string;
  updatedAt?: string;
}

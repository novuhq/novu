import {
  ChannelTypeEnum,
  EnvironmentId,
  IEmailBlock,
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
  name: LayoutName;
  description?: LayoutDescription;
  variables?: ITemplateVariable[];
  content: IEmailBlock[];
  contentType: 'customHtml';
  isDefault: boolean;
  deleted: boolean;
  channel: ChannelTypeEnum;
  createdAt?: string;
  updatedAt?: string;
}

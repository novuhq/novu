import {
  ChannelTypeEnum,
  EnvironmentId,
  IEmailBlock,
  ITemplateVariable,
  OrganizationId,
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
  variables?: ITemplateVariable[];
  content: IEmailBlock[];
  contentType: 'customHtml';
  isDefault: boolean;
  isDeleted: boolean;
  channel: ChannelTypeEnum;
}

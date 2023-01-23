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
} from '../../types';

export class LayoutDto {
  _id?: LayoutId;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  _creatorId: UserId;
  _parentId?: LayoutId;
  name: LayoutName;
  description?: LayoutDescription;
  channel: ChannelTypeEnum;
  content: IEmailBlock[];
  contentType: string;
  variables?: ITemplateVariable[];
  isDefault: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

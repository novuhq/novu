import { ChannelTypeEnum, IEmailBlock, ITemplateVariable } from '../../types';

export class LayoutDto {
  _id?: string;
  _organizationId: string;
  _environmentId: string;
  _creatorId: string;
  _parentId?: string;
  name: string;
  identifier: string;
  description?: string;
  channel: ChannelTypeEnum;
  content: IEmailBlock[];
  contentType: string;
  variables?: ITemplateVariable[];
  isDefault: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

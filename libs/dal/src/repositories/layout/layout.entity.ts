import { Types } from 'mongoose';

import {
  ChannelTypeEnum,
  EnvironmentId,
  ITemplateVariable,
  LayoutDescription,
  LayoutId,
  LayoutName,
  OrganizationId,
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

export type LayoutDBModel = Omit<LayoutEntity, '_environmentId' | '_organizationId' | '_creatorId' | '_parentId'> & {
  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;

  _creatorId: Types.ObjectId;

  _parentId: Types.ObjectId;
};

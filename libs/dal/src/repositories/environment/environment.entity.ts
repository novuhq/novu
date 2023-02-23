import { Types } from 'mongoose';

import type { OrganizationId } from '../organization';

export interface IApiKey {
  key: string;
  _userId: string;
}

export interface IWidgetSettings {
  notificationCenterEncryption: boolean;
}

export interface IDnsSettings {
  mxRecordConfigured: boolean;
  inboundParseDomain: string;
}

export class EnvironmentEntity {
  _id: string;

  name: string;

  _organizationId: OrganizationId;

  identifier: string;

  apiKeys: IApiKey[];

  widget: IWidgetSettings;

  dns?: IDnsSettings;

  _parentId: string;
}

export type EnvironmentDBModel = Omit<EnvironmentEntity, '_organizationId' | '_parentId'> & {
  _organizationId: Types.ObjectId;

  _parentId: Types.ObjectId;

  apiKeys: IApiKey & { _userId: Types.ObjectId }[];
};

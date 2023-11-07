import { Types } from 'mongoose';

import type { OrganizationId } from '../organization';
import type { IEntity, TransformEntityToDbModel, TransformValues } from '../../types';

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

export class EnvironmentEntity implements IEntity {
  _id: string;

  name: string;

  _organizationId: OrganizationId;

  identifier: string;

  apiKeys: IApiKey[];

  widget: IWidgetSettings;

  dns?: IDnsSettings;

  _parentId: string;
}

export type EnvironmentDBModel = TransformEntityToDbModel<
  TransformValues<EnvironmentEntity, 'apiKeys', IApiKey & { _userId: Types.ObjectId }[]>
>;

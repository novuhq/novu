import { Types } from 'mongoose';

import { EncryptedSecret, IApiRateLimitMaximum } from '@novu/shared';

import type { ChangePropsValueType } from '../../types/helpers';
import type { OrganizationId } from '../organization';

export interface IApiKey {
  /*
   * backward compatibility -
   * remove `string` type after encrypt-api-keys-migration run
   * remove the optional from hash
   */
  key: EncryptedSecret | string;
  hash?: string;
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

  apiRateLimits?: IApiRateLimitMaximum;

  widget: IWidgetSettings;

  dns?: IDnsSettings;

  _parentId: string;

  color?: string;

  echo: {
    url: string;
  };
  bridge: {
    url: string;
  };
}

export type EnvironmentDBModel = ChangePropsValueType<
  Omit<EnvironmentEntity, 'apiKeys'>,
  '_organizationId' | '_parentId'
> & {
  apiKeys: IApiKey & { _userId: Types.ObjectId }[];
};

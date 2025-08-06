import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import { StepFilter } from '../notification-template';
import type { OrganizationId } from '../organization';

export class IntegrationEntity {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentialsEntity;

  active: boolean;

  name: string;

  identifier: string;

  priority: number;

  primary: boolean;

  deleted: boolean;

  deletedAt?: string;

  deletedBy?: string;

  conditions?: StepFilter[];

  connected?: boolean;
}

export type ICredentialsEntity = ICredentials;

export type IntegrationDBModel = ChangePropsValueType<IntegrationEntity, '_environmentId' | '_organizationId'>;

export type ProviderCount = {
  providerId: string;
  count: number;
};

import { ChannelTypeEnum, ICredentials } from '@novu/shared';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import { StepFilter } from '../notification-template';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class IntegrationEntity implements IEntity {
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

  deletedAt: string;

  deletedBy: string;

  conditions?: StepFilter[];
}

export type ICredentialsEntity = ICredentials;

export type IntegrationDBModel = TransformEntityToDbModel<IntegrationEntity>;

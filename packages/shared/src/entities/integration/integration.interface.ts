import { ChannelTypeEnum, EnvironmentId, IPreviousStepFilterPart, OrganizationId } from '../../types';
import { IConfigurations } from './configuration.interface';
import { ICredentials } from './credential.interface';

export interface IIntegration {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentials;

  configurations: IConfigurations;

  active: boolean;

  name: string;

  identifier: string;

  priority: number;

  primary: boolean;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;

  conditions?: IPreviousStepFilterPart[];

  connected?: boolean;
}

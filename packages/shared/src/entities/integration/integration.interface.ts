import { ChannelTypeEnum, OrganizationId, EnvironmentId, IPreviousStepFilterPart } from '../../types';
import { ICredentials } from './credential.interface';

export interface IIntegration {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentials;

  active: boolean;

  name: string;

  identifier: string;

  priority: number;

  primary: boolean;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;

  conditions?: IPreviousStepFilterPart[];

  removeNovuBranding?: boolean;

  connected?: boolean;
}

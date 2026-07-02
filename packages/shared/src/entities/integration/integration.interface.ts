import {
  ChannelTypeEnum,
  EnvironmentId,
  IntegrationKindEnum,
  IPreviousStepFilterPart,
  OrganizationId,
} from '../../types';
import { IConfigurations } from './configuration.interface';
import { ICredentials } from './credential.interface';

export interface IIntegration {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  providerId: string;

  channel?: ChannelTypeEnum;

  /** Distinguishes delivery integrations from agent-runtime integrations. Defaults to 'delivery'. */
  kind?: IntegrationKindEnum;

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

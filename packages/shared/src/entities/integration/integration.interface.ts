import {
  BuilderFieldType,
  BuilderGroupValues,
  ChannelTypeEnum,
  EnvironmentId,
  FilterParts,
  IntegrationKindEnum,
  OrganizationId,
} from '../../types';
import { IConfigurations } from './configuration.interface';
import { ICredentials } from './credential.interface';

/**
 * Structurally identical to `IMessageFilter`, redeclared here to keep the integration
 * entity free of a cyclic import on the notification-template entity.
 */
export interface IIntegrationFilter {
  isNegated?: boolean;
  type?: BuilderFieldType;
  value: BuilderGroupValues;
  children: FilterParts[];
}

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

  /** @deprecated Use `rules` (JSONLogic) instead. */
  conditions?: IIntegrationFilter[];

  rules?: Record<string, unknown> | null;

  connected?: boolean;
}

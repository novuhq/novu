import { ChannelTypeEnum, IConfigurations, ICredentials } from '@novu/shared';
import { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import { StepFilter } from '../notification-template';
import type { OrganizationId } from '../organization';

export type ICredentialsEntity = ICredentials;

export type ConfigConfigurationEntity = IConfigurations;

export interface IProvisioningState {
  status: 'pending' | 'ready' | 'failed';
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  /** Internal Teams app catalog ID returned by Graph POST /appCatalogs/teamsApps. Used to build the add-to-Teams deep link. */
  teamsAppCatalogId?: string;
  /**
   * Two-phase commit for OAuth-based quick-setup flows (e.g. Slack).
   *
   * When a quick-setup endpoint creates provider credentials on behalf of the user (e.g. via
   * Slack's apps.manifest.create API), we cannot write them to `integration.credentials`
   * immediately. Doing so would mark the integration as "configured" before the OAuth install
   * completes, and would silently destroy any live credentials if the user abandons the flow
   * or retries. Instead, the credentials are staged here under a random `pendingSetupId`.
   *
   * The same `pendingSetupId` is embedded in the signed OAuth `state` parameter that Slack
   * returns to our callback. On callback the handler verifies the id matches, exchanges the
   * code using the staged credentials, then atomically promotes them to `integration.credentials`
   * and clears these fields — all in one MongoDB update. If the user never completes the flow,
   * the staged credentials remain here harmlessly until the next quick-setup call overwrites them.
   */
  pendingSetupId?: string;
  pendingCredentials?: ICredentialsEntity;
}

export class IntegrationEntity {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentialsEntity;

  configurations?: ConfigConfigurationEntity;

  provisioning?: IProvisioningState;

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

  _parentId?: string;
}

export type IntegrationDBModel = ChangePropsValueType<IntegrationEntity, '_environmentId' | '_organizationId'>;

export type ProviderCount = {
  providerId: string;
  count: number;
};

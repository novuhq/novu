import { IPreferenceChannels } from '../subscriber-preference';
import { EnvironmentId, OrganizationId, WorkflowOverrideId } from '../../types';
import { ITenantEntity } from '../tenant';
import { INotificationTemplate } from '../notification-template';

export interface IWorkflowOverride {
  _id?: WorkflowOverrideId;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _workflowId: string;

  readonly workflow?: INotificationTemplate;

  _tenantId: string;

  readonly tenant?: ITenantEntity;

  active: boolean;

  preferenceSettings: IPreferenceChannels;

  deleted: boolean;

  deletedAt?: string;

  deletedBy?: string;

  createdAt: string;

  updatedAt?: string;
}

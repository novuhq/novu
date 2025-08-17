import { EnvironmentId, OrganizationId, WorkflowOverrideId } from '../../types';
import { INotificationTemplate } from '../notification-template';
import { IPreferenceChannels } from '../subscriber-preference';
import { ITenantEntity } from '../tenant';

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

import { IPreferenceChannelsDto } from '../notification-templates';
import { EnvironmentId, OrganizationId, WorkflowOverrideId } from '../../types';
import { ITenantDto } from '../tenant';
/*
 * TODO:
 * import { INotificationTemplate } from '../notification-template';
 */

export interface IWorkflowOverrideResponseDto {
  _id?: WorkflowOverrideId;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _workflowId: string;

  // TODO:
  readonly workflow?: any;

  _tenantId: string;

  readonly tenant?: ITenantDto;

  active: boolean;

  preferenceSettings: IPreferenceChannelsDto;

  deleted: boolean;

  deletedAt?: string;

  deletedBy?: string;

  createdAt: string;

  updatedAt?: string;
}

export interface IWorkflowOverrideRequestDto {
  active?: boolean;

  preferenceSettings?: IPreferenceChannelsDto;
}

export interface IWorkflowOverridesResponseDto {
  hasMore: boolean;

  data: IWorkflowOverrideResponseDto[];

  pageSize: number;

  page: number;
}

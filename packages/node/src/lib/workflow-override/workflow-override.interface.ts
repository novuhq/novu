import { IPreferenceChannels, WorkflowOverrideId } from '@novu/shared';

export interface IWorkflowOverrides {
  create(data: IWorkflowOverridePayload);
  list(page?: number, limit?: number);
  getOneById(overrideId: string);
  getOneByTenantIdandWorkflowId(workflowId: string, tenantId: string);
  updateOneById(overrideId: string, data: IWorkflowOverrideUpdatePayload);
  updateOneByTenantIdandWorkflowId(
    workflowId: string,
    tenantId: string,
    data: IWorkflowOverrideUpdatePayload
  );
  delete(overrideId: string);
}

export interface IWorkflowOverridePayload {
  workflowId: WorkflowOverrideId;
  tenantId: string;
  active?: boolean;
  preferenceSettings?: IPreferenceChannels;
}

export interface IWorkflowOverrideUpdatePayload {
  active?: boolean;
  preferenceSettings?: IPreferenceChannels;
}

import { IPreferenceChannels, WorkflowOverrideId } from '@novu/shared';

export interface IWorkflowOverrides {
  create(data: IWorkflowOverridePayload);
  getWorkflowOverrides(page?: number, limit?: number);
  getworkflowOverrideById(overrideId: string);
  getWorkflowOverrideByTenant(workflowId: string, tenantId: string);
  updateWorkflowOverrideById(
    overrideId: string,
    data: IWorkflowOverrideUpdatePayload
  );
  updateWorkflowOverride(
    overrideId: string,
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

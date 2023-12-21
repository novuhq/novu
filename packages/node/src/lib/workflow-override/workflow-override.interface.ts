import { IPreferenceChannels, WorkflowOverrideId } from '@novu/shared';

export interface IWorkflowOverrides {
  // createWorkflowOverride(data : IWorkflowOverridePayload);
  create(data: IWorkflowOverridePayload);
  getWorkflowOverrides(page?: number, limit?: number); // get operation
  getworkflowOverrideById(overrideId: string); // get wokflow override by Id
  getWorkflowOverride(workflowId: string, tenantId: string); // get workflow override by tennat
  updateWorkflowOverrideById(
    overrideId: string,
    data: IWorkflowOverrideUpdatePayload
  ); //
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

import { INotificationTemplateStep, IPreferenceChannels } from '@novu/shared';

export interface IWorkflows {
  create(data: IWorkflowPayload);
  update(workflowId: string, data: IWorkflowPayload);
  delete(workflowId: string);
  get(workflowId: string);
  updateStatus(workflowId: string, active: boolean);
  list(page?: number, limit?: number);
}

export interface IWorkflowPayload {
  name: string;
  notificationGroupId: string;
  tags?: string[];
  description?: string;
  steps?: INotificationTemplateStep[];
  active?: boolean;
  draft?: boolean;
  critical?: boolean;
  preferenceSettings?: IPreferenceChannels;
}

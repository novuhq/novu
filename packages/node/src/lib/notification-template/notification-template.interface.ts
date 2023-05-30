import {
  IMessageTemplate,
  INotificationTemplateStep,
  IPreferenceChannels,
} from '@novu/shared';

export interface INotificationTemplates {
  create(data: INotificationTemplatePayload);
  update(templateId: string, data: INotificationTemplatePayload);
  delete(templateId: string);
  getOne(templateId: string);
  updateStatus(templateId: string, active: boolean);
}

interface IMessageTemplateModified extends IMessageTemplate {
  feedId?: string;
  layoutId?: string;
}

interface INotificationTemplateStepModified extends INotificationTemplateStep {
  template: IMessageTemplateModified;
}

export interface INotificationTemplatePayload {
  name: string;
  notificationGroupId: string;
  tags?: string[];
  description?: string;
  steps?: INotificationTemplateStepModified[];
  active?: boolean;
  draft?: boolean;
  critical?: boolean;
  preferenceSettings?: IPreferenceChannels;
}

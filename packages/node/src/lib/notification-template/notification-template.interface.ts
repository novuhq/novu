import {
  INotificationTemplateStep,
  IPreferenceChannels,
} from 'libs/shared/dist';

export interface INotificationTemplates {
  create(
    name: string,
    notificationGroupId: string,
    data: INotificationTemplatePayload
  );
  update(templateId: string, name: string, data: INotificationTemplatePayload);
  delete(templateId: string);
  getOne(templateId: string);
  updateStatus(templateId: string, active: boolean);
}

export interface INotificationTemplatePayload {
  tags?: string[];
  description?: string;
  steps: INotificationTemplateStep[];
  active?: boolean;
  draft?: boolean;
  critical?: boolean;
  preferenceSettings?: IPreferenceChannels;
}

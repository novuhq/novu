import {
  INotificationTemplateStep,
  IPreferenceChannels,
  CustomDataType,
} from '@novu/shared';

export interface INotificationTemplates {
  create(data: INotificationTemplatePayload);
  update(templateId: string, data: INotificationTemplatePayload);
  delete(templateId: string);
  getOne(templateId: string);
  updateStatus(templateId: string, active: boolean);
  getAll(page?: number, limit?: number);
}

export interface INotificationTemplatePayload {
  name: string;
  notificationGroupId: string;
  tags?: string[];
  description?: string;
  steps?: INotificationTemplateStep[];
  active?: boolean;
  draft?: boolean;
  critical?: boolean;
  preferenceSettings?: IPreferenceChannels;
  data?: CustomDataType;
}

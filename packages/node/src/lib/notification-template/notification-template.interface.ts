import {
  INotificationTemplateStep,
  IPreferenceChannels,
} from 'libs/shared/dist';

import { AxiosPromise } from '.pnpm/axios@0.26.1/node_modules/axios';

export interface INotificationTemplates {
  create(
    name: string,
    notificationGroupId: string,
    data: INotificationTemplatePayload
  ): AxiosPromise;
  update(
    templateId: string,
    name: string,
    data: INotificationTemplatePayload
  ): AxiosPromise;
  delete(templateId: string): AxiosPromise;
  getOne(templateId: string): AxiosPromise;
  updateStatus(templateId: string, active: boolean): AxiosPromise;
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

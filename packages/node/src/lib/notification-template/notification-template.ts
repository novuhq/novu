import { AxiosInstance, AxiosPromise } from 'axios';

import { WithHttp } from '../novu.interface';

import {
  INotificationTemplatePayload,
  INotificationTemplates,
} from './notification-template.interface';

export class NotificationTemplates
  extends WithHttp
  implements INotificationTemplates
{
  /*
   *
   */
  async getAll(page?: number, limit?: number) {
    return await this.http.get(`/notification-templates`, {
      params: {
        page,
        limit,
      },
    });
  }

  async create(
    name: string,
    notificationGroupId: string,
    data: INotificationTemplatePayload
  ) {
    return await this.http.post(`/notification-templates`, {
      name,
      notificationGroupId,
      ...data,
    });
  }

  async update(
    templateId: string,
    name: string,
    data: INotificationTemplatePayload
  ) {
    return await this.http.put(`notification-templates/${templateId}`, {
      name,
      ...data,
    });
  }

  async delete(templateId: string) {
    return await this.http.delete(`notification-templates/${templateId}`);
  }

  async getOne(templateId: string) {
    return await this.http.get(`notification-templates/${templateId}`);
  }

  async updateStatus(templateId: string, active: boolean) {
    return await this.http.put(
      `notification-templates/${templateId}/status`,
      active
    );
  }
}

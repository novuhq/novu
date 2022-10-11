import axios from 'axios';

import { WithHttp } from '../novu.interface';

import {
  INotificationTemplatePayload,
  INotificationTemplates,
} from './notification-template.interface';

export class NotificationTemplates
  extends WithHttp
  implements INotificationTemplates
{
  /**
   * @param {number} page - Page number to fetch
   * @param {number} limit - Number of results to fetch in one page
   */
  async getAll(page?: number, limit?: number) {
    if (page === undefined && limit === undefined) {
      return await this.http.get(`/notification-templates`);
    } else if (page === undefined) {
      return await this.http.get(`/notification-templates`, {
        params: {
          limit,
        },
      });
    } else if (limit === undefined) {
      return await this.http.get(`/notification-templates`, {
        params: { page },
      });
    } else {
      return await this.http.get(`/notification-templates`, {
        params: { page, limit },
      });
    }
  }

  /**
   * @param {string} name - Name of the notification-template to create
   * @param {string} notificationGroupId - Id of the group that the notification-template belongs
   * @param {INotificationTemplatePayload} data - All the additional parameters to create a notification-template
   */
  async create(
    name: string,
    notificationGroupId: string,
    data?: INotificationTemplatePayload
  ) {
    return await this.http.post(`/notification-templates`, {
      name,
      notificationGroupId,
      ...data,
    });
  }

  /**
   * @param {string} templateId - templateId of the notification-template to update
   * @param {string} name - Name of the notification-template to update
   * @param {INotificationTemplatePayload} data - All the additional parameters to create a notification-template
   */
  async update(
    templateId: string,
    name: string,
    data?: INotificationTemplatePayload
  ) {
    return await this.http.put(`/notification-templates/${templateId}`, {
      name,
      ...data,
    });
  }

  /**
   * @param {string} templateId - templateId of the notification-template to delete
   */
  async delete(templateId: string) {
    return await this.http.delete(`/notification-templates/${templateId}`);
  }

  /**
   * @param {string} templateId - templateId of the notification-template to get details of
   */
  async getOne(templateId: string) {
    return await this.http.get(`/notification-templates/${templateId}`);
  }

  /**
   * @param {string} templateId - templateId of the notification-template to update status
   * @param {boolean} active - status of the notification-template
   */
  async updateStatus(templateId: string, active: boolean) {
    return await this.http.put(`/notification-templates/${templateId}/status`, {
      active,
    });
  }
}

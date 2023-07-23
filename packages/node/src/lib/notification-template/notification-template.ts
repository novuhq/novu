import {
  INotificationTemplatePayload,
  INotificationTemplates,
} from './notification-template.interface';
import { Novu } from '../novu';

export class NotificationTemplates implements INotificationTemplates {
  constructor(private readonly novu: Novu) {}
  /**
   * @param {number} page - Page number to fetch
   * @param {number} limit - Number of results to fetch in one page
   */
  async getAll(page = 0, limit = 10) {
    return await this.novu.get(`/notification-templates`, {
      params: { page, limit },
    });
  }

  /**
   * @param {INotificationTemplatePayload} data - All the additional parameters to create a notification-template
   */
  async create(data: INotificationTemplatePayload) {
    return await this.novu.post(`/notification-templates`, {
      ...data,
    });
  }

  /**
   * @param {string} templateId - templateId of the notification-template to update
   * @param {INotificationTemplatePayload} data - All the additional parameters to update a notification-template
   */
  async update(templateId: string, data: INotificationTemplatePayload) {
    return await this.novu.put(`/notification-templates/${templateId}`, {
      ...data,
    });
  }

  /**
   * @param {string} templateId - templateId of the notification-template to delete
   */
  async delete(templateId: string) {
    return await this.novu.delete(`/notification-templates/${templateId}`);
  }

  /**
   * @param {string} templateId - templateId of the notification-template to get details of
   */
  async getOne(templateId: string) {
    return await this.novu.get(`/notification-templates/${templateId}`);
  }

  /**
   * @param {string} templateId - templateId of the notification-template to update status
   * @param {boolean} active - status of the notification-template
   */
  async updateStatus(templateId: string, active: boolean) {
    return await this.novu.put(`/notification-templates/${templateId}/status`, {
      active,
    });
  }
}

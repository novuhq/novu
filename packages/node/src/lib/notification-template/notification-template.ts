import { AxiosInstance, AxiosResponse } from 'axios';

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
   * @returns {Promise<AxiosResponse>} - Fetches all the notification-templates with the given parameters
   */
  async getAll(page?: number, limit?: number): Promise<AxiosResponse> {
    return await this.http.get(`/notification-templates`, {
      params: {
        page,
        limit,
      },
    });
  }

  /**
   * @param {string} name - Name of the notification-template to create
   * @param {string} notificationGroupId - Id of the group that the notification-template belongs
   * @param {INotificationTemplatePayload} data - All the additional parameters to create a notification-template
   * @returns {Promise<AxiosResponse>} - Creates the notification-template with the given parameters
   */
  async create(
    name: string,
    notificationGroupId: string,
    data?: INotificationTemplatePayload
  ): Promise<AxiosResponse> {
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
   * @returns {Promise<AxiosResponse>} - Creates the notification-template with the given parameters
   */
  async update(
    templateId: string,
    name: string,
    data?: INotificationTemplatePayload
  ): Promise<AxiosResponse> {
    return await this.http.put(`notification-templates/${templateId}`, {
      name,
      ...data,
    });
  }

  /**
   * @param {string} templateId - templateId of the notification-template to delete
   * @returns {Promise<AxiosResponse>} - Creates the notification-template with the given parameters
   */
  async delete(templateId: string): Promise<AxiosResponse> {
    return await this.http.delete(`notification-templates/${templateId}`);
  }

  /**
   * @param {string} templateId - templateId of the notification-template to get details of
   * @returns {Promise<AxiosResponse>} - Creates the notification-template with the given parameters
   */
  async getOne(templateId: string): Promise<AxiosResponse> {
    return await this.http.get(`notification-templates/${templateId}`);
  }

  /**
   * @param {string} templateId - templateId of the notification-template to update status
   * @param {boolean} active - status of the notification-template
   * @returns {Promise<AxiosResponse>} - Creates the notification-template with the given parameters
   */
  async updateStatus(templateId: string, active: boolean) {
    return await this.http.put(
      `notification-templates/${templateId}/status`,
      active
    );
  }
}

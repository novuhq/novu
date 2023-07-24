import {
  INotificationGroupUpdatePayload,
  INotificationGroups,
} from './notification-groups.interface';
import { WithHttp } from '../novu.interface';

export class NotificationGroups
  extends WithHttp
  implements INotificationGroups
{
  async create(name: string) {
    return await this.postRequest(`/notification-groups`, { name });
  }

  // TODO: add pagination options
  async get() {
    return await this.getRequest(`/notification-groups`);
  }

  async getOne(id: string) {
    return await this.getRequest(`/notification-groups/${id}`);
  }

  async update(id: string, data: INotificationGroupUpdatePayload) {
    return await this.patchRequest(`/notification-groups/${id}`, {
      ...data,
    });
  }

  async delete(id: string) {
    return await this.deleteRequest(`/notification-groups/${id}`);
  }
}

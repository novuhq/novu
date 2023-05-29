import { WithHttp } from '../novu.interface';
import {
  INotificationGroupUpdatePayload,
  INotificationGroups,
} from './notification-groups.interface';

export class NotificationGroups
  extends WithHttp
  implements INotificationGroups
{
  async get() {
    return await this.http.get(`/notification-groups`);
  }

  async getOne(id: string) {
    return await this.http.get(`/notification-groups/${id}`);
  }

  async create(name: string) {
    return await this.http.post(`/notification-groups`, { name });
  }

  async update(id: string, data: INotificationGroupUpdatePayload) {
    return await this.http.patch(`/notification-groups/${id}`, {
      ...data,
    });
  }

  async delete(id: string) {
    return await this.http.delete(`/notification-groups/${id}`);
  }
}

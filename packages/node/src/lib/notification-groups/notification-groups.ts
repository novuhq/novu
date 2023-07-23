import {
  INotificationGroupUpdatePayload,
  INotificationGroups,
} from './notification-groups.interface';
import { Novu } from '../novu';

export class NotificationGroups implements INotificationGroups {
  constructor(private readonly novu: Novu) {}

  async create(name: string) {
    return await this.novu.post(`/notification-groups`, { name });
  }

  // TODO: add pagination options
  async get() {
    return await this.novu.get(`/notification-groups`);
  }

  async getOne(id: string) {
    return await this.novu.get(`/notification-groups/${id}`);
  }

  async update(id: string, data: INotificationGroupUpdatePayload) {
    return await this.novu.patch(`/notification-groups/${id}`, {
      ...data,
    });
  }

  async delete(id: string) {
    return await this.novu.delete(`/notification-groups/${id}`);
  }
}

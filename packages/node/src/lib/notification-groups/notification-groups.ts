import { WithHttp } from '../novu.interface';
import { INotificationGroups } from './notification-groups.interface';

export class NotificationGroups
  extends WithHttp
  implements INotificationGroups
{
  async get() {
    return await this.http.get(`/notification-groups`);
  }

  async create(name: string) {
    return await this.http.post(`/notification-groups`, { name });
  }
}

import { WithHttp } from '../novu.interface';
import {
  INotificationGroups,
  INotificationGroupsPayloadOptions,
} from './notificationGroups.interface';

export class NotificationGroups
  extends WithHttp
  implements INotificationGroups
{
  async get() {
    return await this.http.get(`/notification-groups`);
  }

  async post(data: INotificationGroupsPayloadOptions) {
    return await this.http.post(`/notification-groups`, data);
  }
}

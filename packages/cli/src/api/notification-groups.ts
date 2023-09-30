import { get } from './api.service';
import { API_NOTIFICATION_GROUP_URL } from '../constants';

export function getNotificationGroup() {
  return get(API_NOTIFICATION_GROUP_URL);
}

import { API_NOTIFICATION_GROUP_URL } from '../constants';
import { get } from './api.service';

export function getNotificationGroup() {
  return get(API_NOTIFICATION_GROUP_URL);
}

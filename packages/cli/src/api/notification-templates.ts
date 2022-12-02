import { ICreateNotificationTemplateDto } from '@novu/shared';
import { API_NOTIFICATION_TEMPLATES_URL } from '../constants';
import { post } from './api.service';

export function createNotificationTemplates(body: ICreateNotificationTemplateDto) {
  return post(API_NOTIFICATION_TEMPLATES_URL, body);
}

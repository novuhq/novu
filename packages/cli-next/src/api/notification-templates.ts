import { ICreateNotificationTemplateDto } from '@novu/shared';
import { post } from './api.service';
import { API_NOTIFICATION_TEMPLATES_URL } from '../constants';

export function createNotificationTemplates(body: ICreateNotificationTemplateDto) {
  return post(API_NOTIFICATION_TEMPLATES_URL, body);
}

import { ICreateNotificationTemplateDto } from '@notifire/shared';
import { api } from './api.client';

export async function createTemplate(data: ICreateNotificationTemplateDto) {
  return api.post(`/v1/notification-templates`, data);
}

export async function updateTemplate(templateId: string, data: Partial<ICreateNotificationTemplateDto>) {
  return api.put(`/v1/notification-templates/${templateId}`, data);
}

export async function getTemplateById(id: string) {
  return api.get(`/v1/notification-templates/${id}`);
}

export async function updateTemplateStatus(templateId: string, active: boolean) {
  return api.put(`/v1/notification-templates/${templateId}/status`, { active });
}

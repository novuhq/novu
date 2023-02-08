import { ICreateNotificationTemplateDto } from '@novu/shared';
import { api } from './api.client';

export function getNotificationsList(page = 0, limit = 10) {
  return api.getFullResponse(`/v1/notification-templates`, { page, limit });
}
export async function createTemplate(data: ICreateNotificationTemplateDto) {
  return api.post(`/v1/notification-templates`, data);
}

export async function updateTemplate(templateId: string, data: Partial<ICreateNotificationTemplateDto>) {
  return api.put(`/v1/notification-templates/${templateId}`, data);
}

export async function getTemplateById(id: string) {
  return api.get(`/v1/notification-templates/${id}`);
}

export async function getBlueprintTemplateById(id: string) {
  return api.get(`/v1/notification-templates/${id}/blueprint`);
}

export async function createTemplateFromBluePrintId(id: string) {
  return api.post(`/v1/notification-templates/${id}/blueprint`, {});
}

export async function updateTemplateStatus(templateId: string, active: boolean) {
  return api.put(`/v1/notification-templates/${templateId}/status`, { active });
}

export async function deleteTemplateById(templateId: string) {
  return api.delete(`/v1/notification-templates/${templateId}`);
}

export async function testTrigger(data: Record<string, unknown>) {
  return api.post(`/v1/events/trigger`, data);
}

export async function testSendEmailMessage(data: Record<string, unknown>) {
  return api.post(`/v1/events/test/email`, data);
}

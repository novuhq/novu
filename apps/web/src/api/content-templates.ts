import { IEmailBlock, MessageTemplateContentType } from '@novu/shared';
import { api } from './api.client';

export async function previewEmail({
  content,
  contentType,
  payload,
}: {
  content: string | IEmailBlock[];
  contentType: MessageTemplateContentType;
  payload: string;
}) {
  return api.post('/v1/content-templates/preview/email', { content, contentType, payload });
}

import { IEmailBlock, MessageTemplateContentType } from '@novu/shared';
import { api } from './api.client';

export async function previewEmail({
  content,
  contentType,
}: {
  content: string | IEmailBlock[];
  contentType: MessageTemplateContentType;
}) {
  return api.post('/v1/content-templates/preview/email', { content, contentType });
}

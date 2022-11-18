import { IEmailBlock } from '@novu/shared';
import { api } from './api.client';

export async function previewEmail({
  content,
  contentType,
}: {
  content: string | IEmailBlock[];
  contentType: 'editor' | 'customHtml';
}) {
  return api.post('/v1/content-templates/preview/email', { content, contentType });
}

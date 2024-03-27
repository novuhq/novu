import { IEmailBlock, IMessageButton, IMessageCTA, MessageTemplateContentType } from '@novu/shared';
import { api } from './api.client';

export async function previewEmail({
  content,
  contentType,
  payload,
  subject,
  layoutId,
  locale,
}: {
  content?: string | IEmailBlock[];
  contentType?: MessageTemplateContentType;
  payload: string;
  subject?: string;
  layoutId?: string;
  locale?: string;
}) {
  return api.post('/v1/content-templates/preview/email', { content, contentType, payload, subject, layoutId, locale });
}

export async function previewInApp({
  content,
  cta,
  payload,
  locale,
}: {
  content?: string;
  cta?: IMessageCTA;
  payload: string;
  locale?: string;
}) {
  return api.post('/v1/content-templates/preview/in-app', { content, payload, cta, locale });
}

export async function previewChat({
  content,
  payload,
  locale,
}: {
  content?: string;
  payload: string;
  locale?: string;
}) {
  return api.post('/v1/content-templates/preview/chat', { content, payload, locale });
}

export async function previewSms({
  content,
  payload,
  locale,
}: {
  content?: string | IEmailBlock[];
  payload: string;
  locale?: string;
}): Promise<{ content: string }> {
  return api.post('/v1/content-templates/preview/sms', { content, payload, locale });
}

export async function previewPush({
  content,
  payload,
  locale,
  title,
}: {
  content?: string | IEmailBlock[];
  title?: string;
  payload?: string;
  locale?: string;
}): Promise<{ content: string; title: string }> {
  return api.post('/v1/content-templates/preview/push', { content, payload, locale, title });
}

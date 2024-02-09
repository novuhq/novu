import { api } from './api.client';

export async function getLocalesFromContent({ content }) {
  return api.post('/v1/translations/groups/preview/locales', { content });
}

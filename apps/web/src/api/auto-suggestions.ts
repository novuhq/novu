import { api } from './api.client';

export async function getAiAutosuggestions({
  description,
  channel,
  title,
}: {
  description?: string;
  channel: string;
  title?: string;
}) {
  return api.post('/v1/recommend/get-node-content', { description, channel, title });
}

export async function getAiTranslation({ prompt, dstLanguage }: { prompt: string; dstLanguage: string }) {
  return api.post('/v1/recommend/get-node-translation', { prompt, dstLanguage });
}

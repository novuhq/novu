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
  return api.post('/v1/recommend/get-node-contet', { description, channel, title });
}

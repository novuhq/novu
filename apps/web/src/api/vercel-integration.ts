import { api } from './api.client';

export async function vercelIntegration(code: string) {
  return api.get(`/v1/vercel-integration/${code}`);
}

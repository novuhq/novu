import { api } from './api.client';

export async function vercelIntegrationSetup(vercelIntegrationCode: string) {
  return api.post(`/v1/vercel-integration`, { vercelIntegrationCode });
}

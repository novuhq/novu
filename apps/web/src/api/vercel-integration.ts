import { api } from './api.client';

const partnerIntegrationBaseUrl = '/v1/partner-integrations';

export async function vercelIntegrationSetup({
  vercelIntegrationCode,
  configurationId,
}: {
  vercelIntegrationCode: string;
  configurationId: string;
}) {
  return api.post(`${partnerIntegrationBaseUrl}/vercel`, { vercelIntegrationCode, configurationId });
}

export async function getVercelProjects(configurationId: string) {
  return api.get(`${partnerIntegrationBaseUrl}/vercel/projects/${configurationId}`);
}

export async function completeVercelIntegration(payload: { data: Record<string, string[]>; configurationId: string }) {
  return api.post(`${partnerIntegrationBaseUrl}/vercel/complete`, { ...payload });
}

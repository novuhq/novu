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

export async function getVercelProjects({ queryKey, pageParam }: { queryKey: (string | null)[]; pageParam?: number }) {
  const configurationId = queryKey[1] as string;

  return api.get(
    `${partnerIntegrationBaseUrl}/vercel/projects/${configurationId}${pageParam ? `?nextPage=${pageParam}` : ''}`
  );
}

export async function completeVercelIntegration(payload: { data: Record<string, string[]>; configurationId: string }) {
  return api.post(`${partnerIntegrationBaseUrl}/vercel/configuration/complete`, { ...payload });
}

export async function getVercelConfigurationDetails(configurationId: string) {
  return api.get(`${partnerIntegrationBaseUrl}/vercel/configuration/${configurationId}`);
}

export async function updateVercelIntegration(payload: { data: Record<string, string[]>; configurationId: string }) {
  return api.put(`${partnerIntegrationBaseUrl}/vercel/configuration/update`, { ...payload });
}

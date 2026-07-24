import { post } from './api.client';

export type ClaimKeylessConnectResponse = {
  environmentId: string;
  agentIdentifier?: string;
};

export async function claimKeylessConnect(token: string): Promise<ClaimKeylessConnectResponse> {
  const response = await post<{ data: ClaimKeylessConnectResponse }>('/connect/claim', {
    body: { token },
  });

  return response.data;
}

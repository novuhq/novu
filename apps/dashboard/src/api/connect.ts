import { post } from './api.client';

export type ClaimKeylessConnectResponse = {
  environmentId: string;
  agentIdentifier?: string;
};

export async function claimKeylessConnect(token: string): Promise<ClaimKeylessConnectResponse> {
  return post<ClaimKeylessConnectResponse>('/connect/claim', {
    body: { token },
  });
}

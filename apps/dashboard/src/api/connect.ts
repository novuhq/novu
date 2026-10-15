import type { KeylessCreationSource } from '@novu/shared';
import { post } from './api.client';

export type ClaimKeylessConnectResponse = {
  environmentId: string;
  agentIdentifier?: string;
};

export type ClaimKeylessEnvironmentResponse = {
  kind: 'agent-environment' | 'connect';
  environmentId: string;
  agentIdentifier?: string;
  workflowIdentifiers: string[];
  skippedWorkflowIdentifiers: string[];
};

export type KeylessClaimSourceResponse = {
  source: KeylessCreationSource;
  client?: string;
};

export async function claimKeylessConnect(token: string): Promise<ClaimKeylessConnectResponse> {
  const response = await post<{ data: ClaimKeylessConnectResponse }>('/connect/claim', {
    body: { token },
  });

  return response.data;
}

export async function claimKeylessEnvironment(token: string): Promise<ClaimKeylessEnvironmentResponse> {
  const response = await post<{ data: ClaimKeylessEnvironmentResponse }>('/keyless/environments/claim', {
    body: { token },
  });

  return response.data;
}

/** Who created the keyless environment behind a claim link. Needs no session: it runs on the sign-up page. */
export async function getKeylessClaimSource(token: string): Promise<KeylessClaimSourceResponse> {
  const response = await post<{ data: KeylessClaimSourceResponse }>('/keyless/environments/claim-source', {
    body: { token },
  });

  return response.data;
}

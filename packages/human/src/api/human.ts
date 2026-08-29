import { HumanApiClient, unwrap } from './client';

export type InteractionKind = 'ask' | 'approve' | 'choose' | 'tell';

export type InteractionStatus = 'pending' | 'answered' | 'approved' | 'denied' | 'expired' | 'canceled' | 'delivered';

export interface Interaction {
  id: string;
  kind: InteractionKind;
  status: InteractionStatus;
  prompt: string;
  options?: Array<{ id: string; label: string }>;
  from?: string;
  to: string[];
  integrationIdentifier: string;
  platform: string;
  response?: {
    type: 'text' | 'option';
    text?: string;
    optionId?: string;
    respondedBy?: string;
    respondedBySubscriberId?: string;
    respondedAt: string;
  };
  failedTo?: string[];
  expiresAt: string;
  createdAt: string;
}

export interface CreateInteractionInput {
  kind: InteractionKind;
  prompt: string;
  options?: string[];
  to: string | string[];
  via?: string;
  agentIdentifier?: string;
  from?: string;
  ttlSeconds?: number;
}

export async function createInteraction(client: HumanApiClient, input: CreateInteractionInput): Promise<Interaction> {
  const res = await client.axios.post<{ data?: Interaction } | Interaction>('/v1/human/interactions', input);

  return unwrap(res.data);
}

export async function getInteraction(client: HumanApiClient, id: string): Promise<Interaction> {
  const res = await client.axios.get<{ data?: Interaction } | Interaction>(
    `/v1/human/interactions/${encodeURIComponent(id)}`
  );

  return unwrap(res.data);
}

export async function listInteractions(
  client: HumanApiClient,
  query: { status?: InteractionStatus; to?: string; limit?: number }
): Promise<Interaction[]> {
  const res = await client.axios.get<{ data?: Interaction[] } | Interaction[]>('/v1/human/interactions', {
    params: query,
  });

  return unwrap(res.data);
}

export async function cancelInteraction(client: HumanApiClient, id: string): Promise<Interaction> {
  const res = await client.axios.post<{ data?: Interaction } | Interaction>(
    `/v1/human/interactions/${encodeURIComponent(id)}/cancel`,
    {}
  );

  return unwrap(res.data);
}

export async function setupHumanRelay(
  client: HumanApiClient,
  input: { subscriberId: string; agentIdentifier?: string; email?: string }
): Promise<{ agentId: string; agentIdentifier: string; subscriberId: string }> {
  const res = await client.axios.post<
    | { data?: { agentId: string; agentIdentifier: string; subscriberId: string } }
    | {
        agentId: string;
        agentIdentifier: string;
        subscriberId: string;
      }
  >('/v1/human/setup', input);

  return unwrap(res.data);
}

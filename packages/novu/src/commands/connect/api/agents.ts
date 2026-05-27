import type { ConnectApiClient } from './client';

export interface AgentRecord {
  _id: string;
  identifier: string;
  name: string;
  description?: string;
  active?: boolean;
  runtime?: 'self-hosted' | 'managed';
}

export interface GeneratedAgentSpec {
  name: string;
  identifier: string;
  systemPrompt: string;
  /** Catalog IDs of Claude built-in tool types — already in the wire format expected by `POST /agents`. */
  tools: string[];
  /** MCP server catalog IDs — already in the wire format expected by `POST /agents`. */
  mcpServers: string[];
  /** Skills with only `skillId`; the `type` is implicitly 'anthropic' for generator output. */
  skills: Array<{ skillId: string }>;
}

export interface CreateManagedAgentInput {
  name: string;
  identifier: string;
  integrationId: string;
  providerId: string;
  systemPrompt: string;
  tools: string[];
  mcpServers: string[];
  skills: Array<{ skillId: string }>;
}

export interface AgentIntegrationLink {
  _id: string;
  integrationId: string;
  integrationIdentifier: string;
  providerId: string;
  channel?: string;
  active?: boolean;
  connectedAt?: string | null;
}

export async function listAgents(client: ConnectApiClient): Promise<AgentRecord[]> {
  const res = await client.axios.get<{ data?: AgentRecord[] } | AgentRecord[]>('/v1/agents');
  const body = res.data;

  return Array.isArray(body) ? body : (body.data ?? []);
}

export async function generateAgent(client: ConnectApiClient, prompt: string): Promise<GeneratedAgentSpec> {
  const res = await client.axios.post<{ data?: GeneratedAgentSpec } | GeneratedAgentSpec>('/v1/agents/generate', {
    prompt,
    runtime: 'managed',
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as GeneratedAgentSpec);
}

export async function createManagedAgent(client: ConnectApiClient, input: CreateManagedAgentInput): Promise<AgentRecord> {
  const res = await client.axios.post<{ data?: AgentRecord } | AgentRecord>('/v1/agents', {
    name: input.name,
    identifier: input.identifier,
    runtime: 'managed',
    managedRuntime: {
      providerId: input.providerId,
      integrationId: input.integrationId,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      mcpServers: input.mcpServers,
      // Generate-managed-agent returns `{ skillId }` only; the agent-create
      // DTO expects each entry to also carry `type` (defaults to 'anthropic'
      // for catalog-provided skills).
      skills: input.skills.map((s) => ({ type: 'anthropic' as const, skillId: s.skillId })),
    },
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as AgentRecord);
}

export async function addAgentIntegration(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<AgentIntegrationLink> {
  const res = await client.axios.post<{ data?: AgentIntegrationLink } | AgentIntegrationLink>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations`,
    { integrationIdentifier }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as AgentIntegrationLink);
}

export async function listAgentIntegrations(
  client: ConnectApiClient,
  agentIdentifier: string
): Promise<AgentIntegrationLink[]> {
  const res = await client.axios.get<{ data?: AgentIntegrationLink[] } | AgentIntegrationLink[]>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations`
  );
  const body = res.data;

  return Array.isArray(body) ? body : (body.data ?? []);
}

export async function sendAgentWelcomeMessage(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<void> {
  await client.axios.post(`/v1/agents/${encodeURIComponent(agentIdentifier)}/welcome-message`, {
    integrationIdentifier,
  });
}

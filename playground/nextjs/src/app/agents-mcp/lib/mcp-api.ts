import type { Credentials } from './credentials';

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }
}

export type McpConnectionScope = 'environment' | 'agent' | 'subscriber';
export type McpConnectionAuthMode = 'dcr' | 'novu-app' | 'user-app';
export type McpConnectionStatus = 'pending_oauth' | 'connected' | 'expired' | 'revoked' | 'error';
export type AgentMcpServerStatus = 'active' | 'syncing' | 'error' | 'disabled';

export type AgentSummary = {
  _id: string;
  name: string;
  identifier: string;
  /** `managed` | `self-hosted` — the `AgentRuntime` enum value. */
  runtime?: string;
  active: boolean;
  /**
   * Populated when `runtime === 'managed'`. Carries the upstream provider
   * id (e.g. `anthropic`) so the playground can resolve the runtime's
   * `tokenVault` capability for the storage indicator.
   */
  managedRuntime?: {
    providerId: string;
    integrationId?: string;
    externalAgentId?: string;
  };
};

export type AgentMcpServerEnablement = {
  id: string;
  mcpId: string;
  enabled: boolean;
  defaultScope: McpConnectionScope;
  defaultAuthMode: McpConnectionAuthMode;
  status: AgentMcpServerStatus;
};

export type McpConnectionView = {
  id: string;
  mcpId: string;
  scope: McpConnectionScope;
  authMode: McpConnectionAuthMode;
  status: McpConnectionStatus;
  agentMcpServerId?: string;
  subscriberId?: string;
  expiresAt?: string;
  connectedAt?: string;
};

export class McpApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'McpApiError';
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(credentials: Credentials, path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const jwt = (await window.Clerk?.session?.getToken()) ?? '';
  if (!jwt) {
    throw new McpApiError(401, 'Not signed in to Clerk', null);
  }
  const headers: Record<string, string> = {
    'x-mcp-jwt': jwt,
    'x-mcp-environment-id': credentials.environmentId,
  };

  let body: string | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`/api/mcp-proxy/${path.replace(/^\//, '')}`, {
    method,
    headers,
    body,
    signal: options.signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const message = extractErrorMessage(parsed) ?? `Request failed with status ${response.status}`;
    throw new McpApiError(response.status, message, parsed);
  }

  return parsed as T;
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return typeof body === 'string' ? body : null;
  }

  const record = body as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (Array.isArray(record.message)) return record.message.join(', ');
  if (typeof record.error === 'string') return record.error;

  return null;
}

export type EnvironmentSummary = {
  _id: string;
  name: string;
  type?: string;
  _parentId?: string;
};

/**
 * Hit `/v1/environments` through the proxy. This route is org-scoped — the
 * playground hasn't picked an environment yet, so the `Novu-Environment-Id`
 * header is intentionally omitted. The upstream JWT strategy reads that header
 * as a raw ObjectId, so a sentinel string would 500 with a CastError.
 */
export async function listEnvironments(signal?: AbortSignal): Promise<EnvironmentSummary[]> {
  const jwt = (await window.Clerk?.session?.getToken()) ?? '';
  if (!jwt) {
    throw new McpApiError(401, 'Not signed in to Clerk', null);
  }

  const response = await fetch('/api/mcp-proxy/v1/environments', {
    method: 'GET',
    headers: {
      'x-mcp-jwt': jwt,
    },
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    const message = extractErrorMessage(parsed) ?? `Request failed with status ${response.status}`;
    throw new McpApiError(response.status, message, parsed);
  }

  const raw = (await response.json()) as EnvironmentSummary[] | { data: EnvironmentSummary[] };
  const list = Array.isArray(raw) ? raw : raw.data;

  return list.map((env) => ({ _id: env._id, name: env.name, type: env.type, _parentId: env._parentId }));
}

type ListAgentsEnvelope = {
  data: Array<{
    _id: string;
    name: string;
    identifier: string;
    runtime?: string;
    active: boolean;
    managedRuntime?: { providerId: string; integrationId?: string; externalAgentId?: string };
  }>;
  next: string | null;
  previous: string | null;
  totalCount: number;
};

export async function listAgents(credentials: Credentials, signal?: AbortSignal): Promise<AgentSummary[]> {
  const response = await request<ListAgentsEnvelope>(credentials, 'v1/agents?limit=100', { signal });

  return response.data.map((agent) => ({
    _id: agent._id,
    name: agent.name,
    identifier: agent.identifier,
    runtime: agent.runtime,
    active: agent.active,
    managedRuntime: agent.managedRuntime
      ? {
          providerId: agent.managedRuntime.providerId,
          integrationId: agent.managedRuntime.integrationId,
          externalAgentId: agent.managedRuntime.externalAgentId,
        }
      : undefined,
  }));
}

type ListMcpServersEnvelope = { data: AgentMcpServerEnablement[] };

export async function listAgentMcpServers(
  credentials: Credentials,
  agentIdentifier: string,
  signal?: AbortSignal
): Promise<AgentMcpServerEnablement[]> {
  const response = await request<ListMcpServersEnvelope>(
    credentials,
    `v1/agents/${encodeURIComponent(agentIdentifier)}/mcp-servers`,
    { signal }
  );

  return Array.isArray(response?.data) ? response.data : [];
}

type EnvelopedEnablement = { data: AgentMcpServerEnablement };

export async function enableAgentMcpServer(
  credentials: Credentials,
  agentIdentifier: string,
  body: { mcpId: string; defaultScope?: McpConnectionScope }
): Promise<AgentMcpServerEnablement> {
  const response = await request<EnvelopedEnablement>(
    credentials,
    `v1/agents/${encodeURIComponent(agentIdentifier)}/mcp-servers`,
    { method: 'POST', body }
  );

  return response.data;
}

export async function disableAgentMcpServer(
  credentials: Credentials,
  agentIdentifier: string,
  mcpId: string
): Promise<void> {
  await request<void>(
    credentials,
    `v1/agents/${encodeURIComponent(agentIdentifier)}/mcp-servers/${encodeURIComponent(mcpId)}`,
    { method: 'DELETE' }
  );
}

type GenerateOAuthUrlEnvelope = { data: { authorizeUrl: string } };

export async function generateMcpOAuthUrl(
  credentials: Credentials,
  agentIdentifier: string,
  mcpId: string,
  body: { subscriberId: string }
): Promise<{ authorizeUrl: string }> {
  const response = await request<GenerateOAuthUrlEnvelope>(
    credentials,
    `v1/agents/${encodeURIComponent(agentIdentifier)}/mcp-servers/${encodeURIComponent(mcpId)}/oauth/url`,
    { method: 'POST', body }
  );

  return response.data;
}

type ConnectionStatusEnvelope = { data: McpConnectionView | null };

export async function getMcpConnectionStatus(
  credentials: Credentials,
  agentIdentifier: string,
  mcpId: string,
  subscriberId: string,
  signal?: AbortSignal
): Promise<McpConnectionView | null> {
  const params = new URLSearchParams({ subscriberId });
  const response = await request<ConnectionStatusEnvelope>(
    credentials,
    `v1/agents/${encodeURIComponent(agentIdentifier)}/mcp-servers/${encodeURIComponent(mcpId)}/connection?${params.toString()}`,
    { signal }
  );

  return response.data;
}

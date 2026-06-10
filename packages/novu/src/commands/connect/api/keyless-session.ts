import { createNovuAxios, extractNovuApiMessage } from '../../shared/novu-http';
import { createConnectApiClient, NovuApiError } from './client';
import { findActiveDemoAgentIntegration } from './demo-agent-integration';
import { listIntegrations } from './integrations';

const KEYLESS_ENVIRONMENT_PREFIX = 'pk_keyless_';

interface InboxSessionPayload {
  applicationIdentifier?: string;
}

type InboxSessionResponse = InboxSessionPayload & { data?: InboxSessionPayload };

export interface KeylessSession {
  applicationIdentifier: string;
}

export interface BootstrapKeylessSessionResult extends KeylessSession {
  recoveredFromStaleSession: boolean;
}

export async function bootstrapKeylessSession(
  apiUrl: string,
  storedIdentifier?: string
): Promise<BootstrapKeylessSessionResult> {
  const trimmedStored = storedIdentifier?.trim();
  let attemptedStoredSession = false;

  if (trimmedStored && isKeylessIdentifier(trimmedStored)) {
    attemptedStoredSession = true;
    const restored = await requestKeylessSession(apiUrl, trimmedStored);

    if (restored) {
      const readiness = await checkKeylessEnvironmentReadyForConnect(apiUrl, restored.applicationIdentifier);

      if (readiness.ready) {
        return { ...restored, recoveredFromStaleSession: false };
      }
    }
  }

  const fresh = await requestKeylessSession(apiUrl);

  if (!fresh) {
    throw new Error('Failed to start a keyless session.');
  }

  const readiness = await checkKeylessEnvironmentReadyForConnect(apiUrl, fresh.applicationIdentifier);

  if (!readiness.ready) {
    throw new Error(describeKeylessEnvironmentNotReady(fresh.applicationIdentifier, readiness, apiUrl));
  }

  return { ...fresh, recoveredFromStaleSession: attemptedStoredSession };
}

async function requestKeylessSession(apiUrl: string, applicationIdentifier?: string): Promise<KeylessSession | null> {
  const axios = createNovuAxios({ apiUrl });
  const body = applicationIdentifier ? { applicationIdentifier } : {};

  const res = await axios.post<InboxSessionResponse>('/v1/inbox/session', body, {
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    if (applicationIdentifier && isRecoverableKeylessSessionFailure(res.status, res.data)) {
      return null;
    }

    throw new Error(describeKeylessSessionFailure(res.status, res.data, apiUrl));
  }

  const responseBody = res.data;
  const resolvedIdentifier = responseBody?.data?.applicationIdentifier ?? responseBody?.applicationIdentifier;

  if (!resolvedIdentifier || !isKeylessIdentifier(resolvedIdentifier)) {
    throw new Error('Keyless session response did not include a valid application identifier.');
  }

  return { applicationIdentifier: resolvedIdentifier };
}

function isRecoverableKeylessSessionFailure(status: number, body: unknown): boolean {
  const message = extractNovuApiMessage(body)?.toLowerCase() ?? '';

  if (status === 400) {
    return message.includes('valid application identifier');
  }

  if (status === 404) {
    return message.includes('active in-app integration could not be found');
  }

  return false;
}

interface KeylessEnvironmentReadiness {
  ready: boolean;
  reason: string;
  integrationCount: number;
  agentIntegrationCount: number;
}

function describeKeylessSessionFailure(status: number, body: unknown, apiUrl: string): string {
  const message = extractNovuApiMessage(body);

  if (status === 400) {
    if (message) {
      return `${message} (POST ${apiUrl}/v1/inbox/session returned 400)`;
    }

    return `Failed to start a keyless session (POST ${apiUrl}/v1/inbox/session returned 400 with no error message). Re-run with \`--secret-key <key>\` to use an existing environment.`;
  }

  return message
    ? `Failed to start a keyless session (${status} at ${apiUrl}/v1/inbox/session): ${message}`
    : `Failed to start a keyless session (${status} at ${apiUrl}/v1/inbox/session).`;
}

function describeKeylessEnvironmentNotReady(
  applicationIdentifier: string,
  readiness: KeylessEnvironmentReadiness,
  apiUrl: string
): string {
  const serverFix =
    'On the API server, set NOVU_MANAGED_CLAUDE_API_KEY and enable IS_DEMO_MANAGED_CLAUDE_ENABLED, then restart the API.';
  const bypass = 'Alternatively, re-run with `--secret-key <key>` to use an existing environment.';

  return [
    'Keyless session was created, but Connect could not find the demo agent integration required to create agents.',
    readiness.reason,
    serverFix,
    bypass,
    `Application identifier: ${applicationIdentifier}.`,
    `Integrations found: ${readiness.integrationCount} total, ${readiness.agentIntegrationCount} agent.`,
    `API: ${apiUrl}.`,
  ].join('\n');
}

async function checkKeylessEnvironmentReadyForConnect(
  apiUrl: string,
  applicationIdentifier: string
): Promise<KeylessEnvironmentReadiness> {
  const client = createConnectApiClient({ apiUrl, keylessApplicationIdentifier: applicationIdentifier });
  let integrations;

  try {
    integrations = await listIntegrations(client);
  } catch (err) {
    if (err instanceof NovuApiError && err.status === 401) {
      return {
        ready: false,
        reason: 'The keyless session is no longer authorized for Connect.',
        integrationCount: 0,
        agentIntegrationCount: 0,
      };
    }

    throw err;
  }

  const demoIntegration = findActiveDemoAgentIntegration(integrations);
  const agentIntegrations = integrations.filter((integration) => integration.kind === 'agent');

  if (demoIntegration) {
    return {
      ready: true,
      reason: '',
      integrationCount: integrations.length,
      agentIntegrationCount: agentIntegrations.length,
    };
  }

  let reason = 'The keyless environment is missing an active Novu Anthropic demo agent integration.';

  if (integrations.length === 0) {
    reason =
      'The keyless environment has no integrations — the API likely omitted the demo agent integration during provisioning.';
  } else if (agentIntegrations.length === 0) {
    reason = 'The keyless environment has integrations, but none are agent integrations.';
  }

  return {
    ready: false,
    reason,
    integrationCount: integrations.length,
    agentIntegrationCount: agentIntegrations.length,
  };
}

export function isKeylessIdentifier(value: string | undefined | null): boolean {
  return Boolean(value?.startsWith(KEYLESS_ENVIRONMENT_PREFIX));
}

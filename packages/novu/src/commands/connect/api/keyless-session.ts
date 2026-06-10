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

export async function bootstrapKeylessSession(apiUrl: string): Promise<KeylessSession> {
  const session = await requestKeylessSession(apiUrl);

  const readiness = await checkKeylessEnvironmentReadyForConnect(apiUrl, session.applicationIdentifier);

  if (!readiness.ready) {
    throw new Error(describeKeylessEnvironmentNotReady(session.applicationIdentifier, readiness, apiUrl));
  }

  return session;
}

async function requestKeylessSession(apiUrl: string): Promise<KeylessSession> {
  const axios = createNovuAxios({ apiUrl });

  const res = await axios.post<InboxSessionResponse>(
    '/v1/inbox/session',
    {},
    {
      validateStatus: () => true,
    }
  );

  if (res.status >= 400) {
    throw new Error(describeKeylessSessionFailure(res.status, res.data, apiUrl));
  }

  const responseBody = res.data;
  const resolvedIdentifier = responseBody?.data?.applicationIdentifier ?? responseBody?.applicationIdentifier;

  if (!resolvedIdentifier || !isKeylessIdentifier(resolvedIdentifier)) {
    throw new Error('Keyless session response did not include a valid application identifier.');
  }

  return { applicationIdentifier: resolvedIdentifier };
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
  const isUnauthorized = readiness.reason.includes('no longer authorized');

  if (isUnauthorized) {
    return [
      readiness.reason,
      'Re-run `npx novu connect` to start a fresh keyless session, or use `--secret-key <key>` for an existing environment.',
      `Application identifier: ${applicationIdentifier}.`,
      `API: ${apiUrl}.`,
    ].join('\n');
  }

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

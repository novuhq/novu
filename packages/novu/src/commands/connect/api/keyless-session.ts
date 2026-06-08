import { createNovuAxios, extractNovuApiMessage } from '../../shared/novu-http';
import { createConnectApiClient } from './client';
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

    if (restored && (await isKeylessEnvironmentReadyForConnect(apiUrl, restored.applicationIdentifier))) {
      return { ...restored, recoveredFromStaleSession: false };
    }
  }

  const fresh = await requestKeylessSession(apiUrl);

  if (!fresh) {
    throw new Error('Failed to start a keyless session.');
  }

  if (!(await isKeylessEnvironmentReadyForConnect(apiUrl, fresh.applicationIdentifier))) {
    throw new Error(
      'Keyless mode is not available on this Novu deployment. Re-run with `--secret-key <key>` to use an existing environment.'
    );
  }

  return { ...fresh, recoveredFromStaleSession: attemptedStoredSession };
}

async function requestKeylessSession(
  apiUrl: string,
  applicationIdentifier?: string
): Promise<KeylessSession | null> {
  const axios = createNovuAxios({ apiUrl });
  const body = applicationIdentifier ? { applicationIdentifier } : {};

  const res = await axios.post<InboxSessionResponse>('/v1/inbox/session', body, {
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    if (applicationIdentifier && isRecoverableKeylessSessionFailure(res.status, res.data)) {
      return null;
    }

    throw new Error(describeKeylessSessionFailure(res.status, res.data));
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

function describeKeylessSessionFailure(status: number, body: unknown): string {
  if (status === 400) {
    const message = extractNovuApiMessage(body);

    if (message?.includes('Keyless environment creation is currently disabled')) {
      return message;
    }

    return 'Keyless mode is not available on this Novu deployment. Re-run with `--secret-key <key>` to use an existing environment.';
  }

  const message = extractNovuApiMessage(body);

  return message ? `Failed to start a keyless session (${status}): ${message}` : `Failed to start a keyless session (${status}).`;
}

async function isKeylessEnvironmentReadyForConnect(apiUrl: string, applicationIdentifier: string): Promise<boolean> {
  const client = createConnectApiClient({ apiUrl, keylessApplicationIdentifier: applicationIdentifier });
  const integrations = await listIntegrations(client);

  return findActiveDemoAgentIntegration(integrations) != null;
}

export function isKeylessIdentifier(value: string | undefined | null): boolean {
  return Boolean(value && value.startsWith(KEYLESS_ENVIRONMENT_PREFIX));
}

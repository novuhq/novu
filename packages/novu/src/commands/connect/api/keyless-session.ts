import { createNovuAxios } from '../../shared/novu-http';

const KEYLESS_ENVIRONMENT_PREFIX = 'pk_keyless_';

interface InboxSessionPayload {
  applicationIdentifier?: string;
}

// The API wraps successful responses as `{ data: { ... } }`; tolerate both the
// wrapped and unwrapped shapes.
type InboxSessionResponse = InboxSessionPayload & { data?: InboxSessionPayload };

export interface KeylessSession {
  applicationIdentifier: string;
}

/**
 * Bootstraps an anonymous keyless environment for the Connect CLI by reusing the
 * Inbox session endpoint (`POST /v1/inbox/session`). When `storedIdentifier` is a
 * still-valid `pk_keyless_*` value the API reuses that environment; otherwise it
 * provisions a fresh one. The returned identifier is what the keyless API client
 * sends as the `Keyless` credential for every subsequent Connect request.
 */
export async function bootstrapKeylessSession(apiUrl: string, storedIdentifier?: string): Promise<KeylessSession> {
  const axios = createNovuAxios({ apiUrl });
  const body = storedIdentifier?.startsWith(KEYLESS_ENVIRONMENT_PREFIX) ? { applicationIdentifier: storedIdentifier } : {};

  const res = await axios.post<InboxSessionResponse>('/v1/inbox/session', body, {
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const message =
      res.status === 400
        ? 'Keyless mode is not available on this Novu deployment. Re-run with `--secret-key <key>` to use an existing environment.'
        : `Failed to start a keyless session (${res.status}).`;
    throw new Error(message);
  }

  const responseBody = res.data;
  const applicationIdentifier = responseBody?.data?.applicationIdentifier ?? responseBody?.applicationIdentifier;
  if (!applicationIdentifier || !applicationIdentifier.startsWith(KEYLESS_ENVIRONMENT_PREFIX)) {
    throw new Error('Keyless session response did not include a valid application identifier.');
  }

  return { applicationIdentifier };
}

export function isKeylessIdentifier(value: string | undefined | null): boolean {
  return Boolean(value && value.startsWith(KEYLESS_ENVIRONMENT_PREFIX));
}

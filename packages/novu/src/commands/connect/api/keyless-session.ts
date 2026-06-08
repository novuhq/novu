import { createNovuAxios } from '../../shared/novu-http';

const KEYLESS_ENVIRONMENT_PREFIX = 'pk_keyless_';

interface InboxSessionPayload {
  applicationIdentifier?: string;
}

type InboxSessionResponse = InboxSessionPayload & { data?: InboxSessionPayload };

export interface KeylessSession {
  applicationIdentifier: string;
}

function buildKeylessSessionBody(storedIdentifier?: string): { applicationIdentifier?: string } {
  if (storedIdentifier?.startsWith(KEYLESS_ENVIRONMENT_PREFIX)) {
    return { applicationIdentifier: storedIdentifier };
  }

  return {};
}

function shouldRetryKeylessSessionWithoutStored(status: number): boolean {
  return status === 400 || status === 404;
}

async function requestKeylessSession(
  apiUrl: string,
  storedIdentifier?: string
): Promise<{ status: number; applicationIdentifier?: string }> {
  const axios = createNovuAxios({ apiUrl });
  const res = await axios.post<InboxSessionResponse>('/v1/inbox/session', buildKeylessSessionBody(storedIdentifier), {
    validateStatus: () => true,
  });
  const responseBody = res.data;
  const applicationIdentifier = responseBody?.data?.applicationIdentifier ?? responseBody?.applicationIdentifier;

  return { status: res.status, applicationIdentifier };
}

export async function bootstrapKeylessSession(apiUrl: string, storedIdentifier?: string): Promise<KeylessSession> {
  let session = await requestKeylessSession(apiUrl, storedIdentifier);

  if (
    session.status >= 400 &&
    storedIdentifier?.startsWith(KEYLESS_ENVIRONMENT_PREFIX) &&
    shouldRetryKeylessSessionWithoutStored(session.status)
  ) {
    session = await requestKeylessSession(apiUrl);
  }

  if (session.status >= 400) {
    const message =
      session.status === 400
        ? 'Keyless mode is not available on this Novu deployment. Re-run with `--secret-key <key>` to use an existing environment.'
        : `Failed to start a keyless session (${session.status}).`;
    throw new Error(message);
  }

  const applicationIdentifier = session.applicationIdentifier;
  if (!applicationIdentifier || !applicationIdentifier.startsWith(KEYLESS_ENVIRONMENT_PREFIX)) {
    throw new Error('Keyless session response did not include a valid application identifier.');
  }

  return { applicationIdentifier };
}

export function isKeylessIdentifier(value: string | undefined | null): boolean {
  return Boolean(value?.startsWith(KEYLESS_ENVIRONMENT_PREFIX));
}

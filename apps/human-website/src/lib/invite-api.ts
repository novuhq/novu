export type InviteChannelVia = 'telegram' | 'slack';

export type InviteChannel = {
  via: InviteChannelVia;
  connected: boolean;
  isDefault: boolean;
};

export type InviteStatus =
  | {
      valid: true;
      agentName: string;
      /** Display name of the invited person, falling back to their subscriberId. */
      inviteeName: string;
      /** ISO timestamp when the invite link expires. */
      expiresAt: string;
      channels: InviteChannel[];
    }
  | { valid: false; reason: 'expired' | 'declined' | 'invalid' };

export type ActiveInviteStatus = Extract<InviteStatus, { valid: true }>;

export type InviteErrorCode =
  | 'token_invalid'
  | 'token_expired'
  | 'invite_declined'
  | 'channel_unavailable'
  | 'channel_already_connected'
  | 'channel_not_connected'
  | 'unknown';

const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set<InviteErrorCode>([
  'token_invalid',
  'token_expired',
  'invite_declined',
  'channel_unavailable',
  'channel_already_connected',
  'channel_not_connected',
]);

export class InviteRequestError extends Error {
  constructor(
    public readonly code: InviteErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

/**
 * Public invite endpoints of the Novu API. The token from the invite link is the only
 * credential, so nothing here sends cookies or API keys.
 */
export async function getInviteStatus(apiUrl: string, token: string, signal?: AbortSignal): Promise<InviteStatus> {
  return request<InviteStatus>(
    `${apiUrl}/v1/human/invites/status?token=${encodeURIComponent(token)}`,
    { method: 'GET', signal },
    'Failed to load the invitation'
  );
}

/** Mints a fresh Telegram deep link or Slack authorize URL for the invited person. */
export async function connectInviteChannel(
  apiUrl: string,
  token: string,
  via: InviteChannelVia
): Promise<{ url: string }> {
  return postAction(apiUrl, 'connect', { token, via }, 'Failed to start connecting');
}

export async function setInviteDefaultChannel(
  apiUrl: string,
  token: string,
  via: InviteChannelVia
): Promise<{ defaultVia: InviteChannelVia }> {
  return postAction(apiUrl, 'default', { token, via }, 'Failed to update the default app');
}

export async function declineInvite(apiUrl: string, token: string): Promise<{ declined: true }> {
  return postAction(apiUrl, 'decline', { token }, 'Failed to decline the invitation');
}

async function postAction<T>(
  apiUrl: string,
  action: 'connect' | 'default' | 'decline',
  body: Record<string, string>,
  fallbackMessage: string
): Promise<T> {
  return request<T>(
    `${apiUrl}/v1/human/invites/${action}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    fallbackMessage
  );
}

async function request<T>(url: string, init: RequestInit, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'omit' });
  const data = await safeJson(response);

  if (!response.ok) {
    throw new InviteRequestError(readErrorCode(data), readErrorMessage(data) ?? fallbackMessage, response.status);
  }

  // The API wraps every successful body in `{ data: ... }`.
  return (data && 'data' in data ? data.data : data) as T;
}

type JsonBody = Record<string, unknown> | null;

async function safeJson(response: Response): Promise<JsonBody> {
  try {
    const body = await response.json();

    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

/** Nest's HttpException with an object payload nests the response under `message`. */
function readErrorCode(data: JsonBody): InviteErrorCode {
  const message = data?.message;
  const candidate =
    typeof message === 'object' && message !== null && 'code' in message
      ? (message as { code?: unknown }).code
      : data?.code;

  return typeof candidate === 'string' && KNOWN_ERROR_CODES.has(candidate) ? (candidate as InviteErrorCode) : 'unknown';
}

function readErrorMessage(data: JsonBody): string | undefined {
  const message = data?.message;

  if (typeof message === 'string') {
    return message;
  }

  if (typeof message === 'object' && message !== null && 'message' in message) {
    const inner = (message as { message?: unknown }).message;

    return typeof inner === 'string' ? inner : undefined;
  }

  return undefined;
}

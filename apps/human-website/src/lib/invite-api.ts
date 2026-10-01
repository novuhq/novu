export type InviteChannelVia = 'telegram' | 'slack' | 'email';

export type InviteChannelStatus = 'unverified' | 'pending' | 'verified';

export type InviteChannel = {
  via: InviteChannelVia;
  connected: boolean;
  isDefault: boolean;
  status: InviteChannelStatus;
  /** Masked address for email (e.g. `a***@b.com`). */
  address?: string;
};

/** Who is asking to reach the invitee. Both fields are optional; use `describeSender` to render. */
export type InviteSender = {
  /** The agent's own name; absent while it still has its placeholder name. */
  agentName?: string;
  /** Person who owns the agent, when they set a name during setup. */
  operatorName?: string;
};

/** "Nikita Grossman's Deploy bot", "Nikita Grossman's agent", "Deploy bot", or "An agent". */
export function describeSender(sender: InviteSender): string {
  if (sender.operatorName) {
    return `${sender.operatorName}'s ${sender.agentName ?? 'agent'}`;
  }

  return sender.agentName ?? 'An agent';
}

export type InviteStatus =
  | (InviteSender & {
      valid: true;
      /** Display name of the invited person, falling back to their subscriberId. */
      inviteeName: string;
      /** ISO timestamp when the invite link expires. */
      expiresAt: string;
      channels: InviteChannel[];
    })
  | { valid: false; reason: 'expired' | 'declined' | 'invalid' };

export type ActiveInviteStatus = Extract<InviteStatus, { valid: true }>;

export type InviteErrorCode =
  | 'token_invalid'
  | 'token_expired'
  | 'invite_declined'
  | 'channel_unavailable'
  | 'channel_already_connected'
  | 'channel_not_connected'
  | 'address_required'
  | 'address_invalid'
  | 'verification_cooldown'
  | 'verification_cap'
  | 'verification_superseded'
  | 'verification_used'
  | 'unknown';

export type VerifyAddressResult = InviteSender & {
  verified: true;
  via: InviteChannelVia;
  address: string;
};

export type ConnectInviteResult =
  | { url: string }
  | { via: 'email'; address: string; expiresAt: string; retryAfterSeconds: number };

const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set<InviteErrorCode>([
  'token_invalid',
  'token_expired',
  'invite_declined',
  'channel_unavailable',
  'channel_already_connected',
  'channel_not_connected',
  'address_required',
  'address_invalid',
  'verification_cooldown',
  'verification_cap',
  'verification_superseded',
  'verification_used',
]);

export class InviteRequestError extends Error {
  constructor(
    public readonly code: InviteErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number
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

/** Mints a fresh Telegram deep link / Slack authorize URL, or starts email verification. */
export async function connectInviteChannel(
  apiUrl: string,
  token: string,
  via: InviteChannelVia,
  address?: string
): Promise<ConnectInviteResult> {
  return postAction(apiUrl, 'connect', { token, via, ...(address ? { address } : {}) }, 'Failed to start connecting');
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

/** Claims a verification token from the email link. */
export async function verifyAddress(apiUrl: string, token: string, signal?: AbortSignal): Promise<VerifyAddressResult> {
  return request<VerifyAddressResult>(
    `${apiUrl}/v1/human/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal,
    },
    'Failed to verify this email'
  );
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
    throw new InviteRequestError(
      readErrorCode(data),
      readErrorMessage(data) ?? fallbackMessage,
      response.status,
      readRetryAfter(data)
    );
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

function readRetryAfter(data: JsonBody): number | undefined {
  const message = data?.message;
  const candidate =
    typeof message === 'object' && message !== null && 'retryAfterSeconds' in message
      ? (message as { retryAfterSeconds?: unknown }).retryAfterSeconds
      : data?.retryAfterSeconds;

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : undefined;
}

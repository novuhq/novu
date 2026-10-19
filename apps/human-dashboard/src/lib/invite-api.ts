import {
  type JsonBody,
  readErrorMessage,
  readErrorCode as readRawErrorCode,
  safeJson,
  unwrapData,
} from './api-response';

export type InviteChannelVia = 'telegram' | 'slack' | 'email';

export type InviteChannelStatus = 'unverified' | 'pending' | 'verified';

export type InviteChannel = {
  via: InviteChannelVia;
  connected: boolean;
  isDefault: boolean;
  status: InviteChannelStatus;
  /** Masked address for email (e.g. `a***@b.com`). */
  address?: string;
  /** False when this setup cannot offer the channel at all (e.g. email on a keyless demo). */
  available: boolean;
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
  | {
      valid: true;
      agentName: string;
      /** Where the agent's own picture can be loaded. Missing when it has none. */
      agentPictureUrl?: string;
      /** Who invited them: the account owner's name. Missing when they haven't given one. */
      inviterName?: string;
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
  | 'address_required'
  | 'address_invalid'
  | 'verification_cooldown'
  | 'verification_cap'
  | 'verification_superseded'
  | 'verification_used'
  | 'verification_code_invalid'
  | 'verification_code_too_many_tries'
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
  'verification_code_invalid',
  'verification_code_too_many_tries',
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
  const status = await request<InviteStatus>(
    `${apiUrl}/v1/human/invites/status?token=${encodeURIComponent(token)}`,
    { method: 'GET', signal },
    'Failed to load the invitation'
  );

  if (!status.valid) {
    return status;
  }

  // An API older than the send caps release omits `available`; it offered every channel.
  return {
    ...status,
    channels: status.channels.map((channel) => ({ ...channel, available: channel.available !== false })),
  };
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

/** Confirms the invite's pending address with the 6-digit code from the email. */
export async function verifyInviteCode(apiUrl: string, token: string, code: string): Promise<VerifyAddressResult> {
  return request<VerifyAddressResult>(
    `${apiUrl}/v1/human/verify-code`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteToken: token, code }),
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

  return unwrapData<T>(data);
}

function readErrorCode(data: JsonBody): InviteErrorCode {
  const candidate = readRawErrorCode(data);

  return candidate && KNOWN_ERROR_CODES.has(candidate) ? (candidate as InviteErrorCode) : 'unknown';
}

function readRetryAfter(data: JsonBody): number | undefined {
  const message = data?.message;
  const candidate =
    typeof message === 'object' && message !== null && 'retryAfterSeconds' in message
      ? (message as { retryAfterSeconds?: unknown }).retryAfterSeconds
      : data?.retryAfterSeconds;

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : undefined;
}

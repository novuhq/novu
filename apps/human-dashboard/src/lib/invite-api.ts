import {
  type JsonBody,
  readErrorMessage,
  readErrorCode as readRawErrorCode,
  safeJson,
  unwrapData,
} from './api-response';

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

  return unwrapData<T>(data);
}

function readErrorCode(data: JsonBody): InviteErrorCode {
  const candidate = readRawErrorCode(data);

  return candidate && KNOWN_ERROR_CODES.has(candidate) ? (candidate as InviteErrorCode) : 'unknown';
}

import {
  type JsonBody,
  readErrorMessage,
  readErrorCode as readRawErrorCode,
  safeJson,
  unwrapData,
} from './api-response';
import type { InactiveSetupReason, SetupChannel } from './setup-link';

export type SetupLinkStatus = { valid: true; agentName?: string } | { valid: false; reason: InactiveSetupReason };

export type TelegramSetupResult = {
  botUsername: string;
  deepLinkUrl?: string;
};

export type SlackSetupResult = {
  authorizeUrl?: string;
};

export type SetupLinkErrorCode = 'token_invalid' | 'token_expired' | 'token_already_used' | 'unknown';

const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set<SetupLinkErrorCode>([
  'token_invalid',
  'token_expired',
  'token_already_used',
]);

export class SetupLinkRequestError extends Error {
  constructor(
    public readonly code: SetupLinkErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

/**
 * Public setup endpoints the `/connect` page calls. The token from the link is the only
 * credential, so nothing here sends cookies or API keys.
 */
export async function getSetupLinkStatus(
  apiUrl: string,
  channel: SetupChannel,
  token: string,
  signal?: AbortSignal
): Promise<SetupLinkStatus> {
  const path =
    channel === 'slack' ? '/v1/agents/public/slack/setup/status' : '/v1/integrations/mobile-configure/status';
  const data = await request(
    `${apiUrl}${path}?token=${encodeURIComponent(token)}`,
    { method: 'GET', signal },
    'Could not verify the setup link.'
  );

  return asStatus(data);
}

export async function submitTelegramSetup(
  apiUrl: string,
  token: string,
  botToken: string
): Promise<TelegramSetupResult> {
  const data = await request(
    `${apiUrl}/v1/integrations/mobile-configure`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, botToken }),
    },
    'Telegram did not accept that token. Double-check the message from @BotFather and try again.'
  );

  return {
    botUsername: stringField(data, 'botUsername') ?? '',
    deepLinkUrl: stringField(data, 'deepLinkUrl'),
  };
}

export async function submitSlackSetup(apiUrl: string, token: string, configToken: string): Promise<SlackSetupResult> {
  const data = await request(
    `${apiUrl}/v1/agents/public/slack/setup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, configToken }),
    },
    'Slack did not accept that token. Generate a fresh one at api.slack.com/apps and try again.'
  );

  return { authorizeUrl: stringField(data, 'authorizeUrl') };
}

async function request(url: string, init: RequestInit, fallbackMessage: string): Promise<JsonBody> {
  const response = await fetch(url, { ...init, credentials: 'omit' });
  const data = await safeJson(response);

  if (!response.ok) {
    throw new SetupLinkRequestError(readErrorCode(data), readErrorMessage(data) ?? fallbackMessage, response.status);
  }

  return unwrapData<JsonBody>(data);
}

function readErrorCode(data: JsonBody): SetupLinkErrorCode {
  const candidate = readRawErrorCode(data);

  return candidate && KNOWN_ERROR_CODES.has(candidate) ? (candidate as SetupLinkErrorCode) : 'unknown';
}

function asStatus(data: JsonBody): SetupLinkStatus {
  if (!data || data.valid !== true) {
    const reason = data?.reason;

    return { valid: false, reason: reason === 'expired' || reason === 'used' ? reason : 'invalid' };
  }

  const agentName = data.agentName;

  return { valid: true, ...(typeof agentName === 'string' && agentName ? { agentName } : {}) };
}

function stringField(data: JsonBody, key: string): string | undefined {
  const value = data?.[key];

  return typeof value === 'string' && value ? value : undefined;
}

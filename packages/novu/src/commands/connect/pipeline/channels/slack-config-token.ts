import { NovuApiError } from '../../api/client';

export const MAX_SLACK_CONFIG_TOKEN_ATTEMPTS = 5;

/** Returns a user-facing error when the token is clearly the wrong Slack token type. */
export function validateSlackConfigTokenFormat(token: string): string | undefined {
  const trimmed = token.trim();
  if (!trimmed) {
    return 'Paste an App Configuration Token to continue.';
  }

  if (trimmed.startsWith('xoxb-')) {
    return 'That looks like a bot token (xoxb-). Paste an App Configuration Token from api.slack.com/apps — it starts with xoxe.xoxp-.';
  }

  if (trimmed.startsWith('xapp-')) {
    return 'That looks like an app-level token (xapp-). Paste an App Configuration Token — it starts with xoxe.xoxp-.';
  }

  if (trimmed.startsWith('xoxp-') && !trimmed.startsWith('xoxe.')) {
    return 'That looks like a user token (xoxp-). Paste an App Configuration Token — it starts with xoxe.xoxp-.';
  }

  if (!trimmed.startsWith('xoxe.')) {
    return 'App Configuration Tokens start with xoxe. — generate one at the bottom of api.slack.com/apps.';
  }

  return undefined;
}

export function isRepromptableSlackConfigTokenError(err: unknown): boolean {
  if (!(err instanceof NovuApiError)) {
    return false;
  }

  if (err.status === 0) {
    return false;
  }

  if (/not_allowed_token_type/i.test(err.message)) {
    return true;
  }

  return err.status >= 400 && err.status < 500;
}

export function describeSlackConfigTokenError(err: unknown): string {
  if (err instanceof NovuApiError && /not_allowed_token_type/i.test(err.message)) {
    return 'Slack rejected that token type. Paste an App Configuration Token (xoxe.xoxp-…), not a bot token.';
  }

  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}

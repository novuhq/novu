export type SetupChannel = 'telegram' | 'slack';

export type InactiveSetupReason = 'expired' | 'used' | 'invalid';

/** Kept in sync with the Telegram bot token check on `ConsumeTelegramMobileLinkRequestDto`. */
const BOT_TOKEN_PATTERN = /^\d{8,}:[A-Za-z0-9_-]{35,}$/;
const TOKEN_IN_TEXT_PATTERN = /(\d{8,}:[A-Za-z0-9_-]{35,})/;
const USERNAME_PATTERN = /t\.me\/([A-Za-z0-9_]+)/i;

/**
 * The setup token lives in the URL fragment (`#…` or `#token=…`), which the browser
 * never sends to this app's server. Anything else in the hash is treated as missing.
 */
export function readSetupToken(hash: string): string {
  const raw = hash.replace(/^#/, '').trim();
  const match = raw.match(/^(?:token=)?([A-Za-z0-9_-]+)$/);

  return match?.[1] ?? '';
}

export function setupChannelOf(channel: string | string[] | undefined): SetupChannel {
  const requested = Array.isArray(channel) ? channel[0] : channel;

  return requested === 'slack' ? 'slack' : 'telegram';
}

/** Pulls a bot token out of a pasted BotFather reply. `credential` stays null until the paste is usable. */
export function parseTelegramCredential(draft: string): { credential: string | null; status: string } {
  const tokenMatch = draft.match(TOKEN_IN_TEXT_PATTERN);
  const candidate = tokenMatch?.[1] ?? null;

  if (!candidate || !BOT_TOKEN_PATTERN.test(candidate)) {
    return {
      credential: null,
      status: 'No token found yet. Paste the whole message — it starts with "Done!".',
    };
  }

  const usernameMatch = draft.match(USERNAME_PATTERN);
  const status = usernameMatch ? `Token detected for @${usernameMatch[1]}.` : 'Token detected.';

  return { credential: candidate, status };
}

export function rerunCommand(channel: SetupChannel): string {
  switch (channel) {
    case 'telegram':
      return 'npx @agentinbox/cli channel add telegram';
    case 'slack':
      return 'npx @agentinbox/cli channel add slack';
    default: {
      const exhaustive: never = channel;

      return exhaustive;
    }
  }
}

/**
 * Strict format of the bot token issued by BotFather.
 * Used for both client-side validation and server-side `class-validator` matching.
 */
const BOT_TOKEN_PATTERN = /^\d{8,}:[A-Za-z0-9_-]{35,}$/;

const TOKEN_IN_TEXT_PATTERN = /(\d{8,}:[A-Za-z0-9_-]{35,})/;
const USERNAME_PATTERN = /t\.me\/([A-Za-z0-9_]+)/i;

export type ParsedBotFatherMessage = {
  token: string | null;
  botUsername: string | null;
};

/**
 * Best-effort parse of a BotFather confirmation message.
 * Returns the bot HTTP API token and t.me/<username> if found, both nullable.
 */
export function parseBotFatherMessage(text: string): ParsedBotFatherMessage {
  if (!text) return { token: null, botUsername: null };

  const tokenMatch = text.match(TOKEN_IN_TEXT_PATTERN);
  const usernameMatch = text.match(USERNAME_PATTERN);

  return {
    token: tokenMatch?.[1] ?? null,
    botUsername: usernameMatch?.[1] ?? null,
  };
}

/** Returns true when the supplied string matches the strict bot-token format. */
export function isValidBotToken(token: string): boolean {
  return BOT_TOKEN_PATTERN.test(token);
}

/**
 * Telegram `?start=` allows at most 64 base64url chars; we only treat non-empty payloads.
 */
const TELEGRAM_START_COMMAND = /^\/start(?:@[\w_]+)?\s+(\S+)\s*$/;

export function extractTelegramStartToken(text: string | undefined): string | null {
  if (!text) return null;

  const match = TELEGRAM_START_COMMAND.exec(text.trim());

  return match ? match[1] : null;
}

export function extractTelegramChatIdFromUpdate(update: Record<string, unknown>): string | null {
  const message = asRecord(update.message) ?? asRecord(update.edited_message);
  const chat = message ? asRecord(message.chat) : undefined;
  const chatId = chat?.id;

  if (chatId === undefined || chatId === null) {
    return null;
  }

  return String(chatId);
}

export function extractTelegramMessageText(update: Record<string, unknown>): string | undefined {
  const message = asRecord(update.message) ?? asRecord(update.edited_message);
  const text = message?.text;

  return typeof text === 'string' ? text : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

export function resolveTelegramApiBaseUrl(): string {
  return (process.env.TELEGRAM_API_BASE_URL ?? 'https://api.telegram.org').replace(/\/$/, '');
}

export function buildTelegramBotApiUrl(botToken: string, method: string): string {
  return `${resolveTelegramApiBaseUrl()}/bot${botToken}/${method}`;
}

export function buildIntegrationTelegramWebhookUrl(environmentId: string, integrationIdentifier: string): string {
  const base = (process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(
    /\/$/,
    ''
  );

  return `${base}/v1/integrations/webhook/${environmentId}/${integrationIdentifier}`;
}

export function buildAgentTelegramWebhookUrl(agentId: string, integrationIdentifier: string): string {
  const base = (process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(
    /\/$/,
    ''
  );

  return `${base}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

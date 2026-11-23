import type { TelegramFormatConverter } from '@chat-adapter/telegram';
import type { Message, SlashCommandEvent } from 'chat';
import { esmImport } from '../../shared/util/esm-import';

/**
 * The Telegram adapter parses and caches the inbound message before emitting
 * the slash-command event, so the cached copy (with formatting, author flags,
 * and attachments intact) is preferred. Falls back to rebuilding the message
 * from the event payload when the in-process cache no longer holds it, parsing
 * the command text with the adapter's own bounded `parseIncoming`.
 */
export async function resolveTelegramCommandMessage(event: SlashCommandEvent, threadId: string): Promise<Message> {
  const raw = event.raw as { message_id?: number; chat?: { id?: number | string }; date?: number } | undefined;
  const chatId = raw?.chat?.id;
  const rawMessageId = raw?.message_id;
  const hasPlatformIds = chatId !== undefined && rawMessageId !== undefined;
  // Mirrors the Telegram adapter's `encodeMessageId` composite format so the
  // chat SDK dedupe key matches the one a regular-message delivery would use.
  const messageId = hasPlatformIds ? `${chatId}:${rawMessageId}` : `telegram-command:${threadId}:${Date.now()}`;

  if (hasPlatformIds && event.adapter.fetchMessage) {
    const cachedMessage = await event.adapter.fetchMessage(threadId, messageId);
    if (cachedMessage) {
      return cachedMessage;
    }
  }

  const [{ Message: MessageCtor }, { TelegramFormatConverter: ConverterCtor }] = await Promise.all([
    esmImport('chat'),
    esmImport('@chat-adapter/telegram'),
  ]);
  const converter: TelegramFormatConverter = new ConverterCtor();
  const text = event.text ? `${event.command} ${event.text}` : event.command;

  return new MessageCtor({
    id: messageId,
    threadId,
    text,
    formatted: converter.parseIncoming(text).formatted,
    raw: event.raw,
    author: event.user,
    metadata: { dateSent: raw?.date !== undefined ? new Date(raw.date * 1000) : new Date() },
    attachments: [],
  });
}

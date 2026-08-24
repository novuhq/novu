import type {
  ForceReply,
  InlineKeyboardMarkup,
  LinkPreviewOptions,
  MessageEntity,
  Opts,
  ParseMode,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
  ReplyParameters,
  SuggestedPostParameters,
} from '@grammyjs/types';
import { NON_OVERRIDABLE_TELEGRAM_KEYS } from '../src/consts/providers/provider-overrides/telegram/keys.ts';

export { NON_OVERRIDABLE_TELEGRAM_KEYS };

/**
 * Structural mirror of Bot API `sendMessage` args minus `chat_id`.
 *
 * `ts-json-schema-generator` cannot expand `Opts['sendMessage']` mapped types, so top-level fields
 * are restated here and nested types are imported from `@grammyjs/types`. The assert below fails
 * `check:scripts` if the restated shape drifts from the SDK. The generator's
 * `makeEveryTopLevelKeyOptional` then drops top-level `required` so overrides stay partial patches.
 *
 * Field descriptions mirror https://core.telegram.org/bots/api#sendmessage and the `@grammyjs/types`
 * JSDoc so editor autocomplete stays useful without hand-editing the generated artifact.
 */
export interface TelegramOverride {
  /** Unique identifier of the business connection on behalf of which the message will be sent */
  business_connection_id?: string;
  /** Unique identifier for the target message thread (topic) of a forum; for forum supergroups and private chats of bots with forum topic mode enabled only */
  message_thread_id?: number;
  /** Identifier of the direct messages topic to which the message will be sent; required if the message is sent to a direct messages chat */
  direct_messages_topic_id?: number;
  /** For outgoing ephemeral messages, unique identifier of the user who will receive the message; for group and supergroup chats only */
  receiver_user_id?: number;
  /** For outgoing ephemeral messages, identifier of the callback query which triggered the message if any */
  callback_query_id?: string;
  /** Text of the message to be sent, 1-4096 characters after entities parsing. Falls back to the default step body when omitted. */
  text: string;
  /** Mode for parsing entities in the message text. See formatting options for more details. */
  parse_mode?: ParseMode;
  /** A list of special entities that appear in message text, which can be specified instead of parse_mode */
  entities?: MessageEntity[];
  /** Link preview generation options for the message */
  link_preview_options?: LinkPreviewOptions;
  /** Sends the message silently. Users will receive a notification with no sound. */
  disable_notification?: boolean;
  /** Protects the contents of the sent message from forwarding and saving */
  protect_content?: boolean;
  /** Pass True to allow up to 1000 messages per second, ignoring broadcasting limits for a fee of 0.1 Telegram Stars per message */
  allow_paid_broadcast?: boolean;
  /** An object containing the parameters of the suggested post to send; for direct messages chats only */
  suggested_post_parameters?: SuggestedPostParameters;
  /** Unique identifier of the message effect to be added to the message; for private chats only */
  message_effect_id?: string;
  /** Description of the message to reply to */
  reply_parameters?: ReplyParameters;
  /** Additional interface options. An object for an inline keyboard, custom reply keyboard, instructions to remove a reply keyboard or to force a reply from the user. */
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;
  /** @deprecated Use `reply_parameters` instead. */
  reply_to_message_id?: number;
}

type SdkSendMessageOverride = Omit<Opts<never>['sendMessage'], (typeof NON_OVERRIDABLE_TELEGRAM_KEYS)[number]>;

type AssertExact<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : never;

type AssertTelegramOverrideMatchesSdk = AssertExact<TelegramOverride, SdkSendMessageOverride>;
const _assertTelegramOverrideMatchesSdk: AssertTelegramOverrideMatchesSdk = true;

/**
 * Hand-written twin of the generated Telegram schema's top-level shape, so key-level validation and
 * the provider registry never have to pull the generated artifact into a bundle.
 * `telegram-override.drift.spec.ts` fails if these drift apart.
 */
export const TELEGRAM_OVERRIDE_KEYS = [
  'business_connection_id',
  'message_thread_id',
  'direct_messages_topic_id',
  'receiver_user_id',
  'callback_query_id',
  'text',
  'parse_mode',
  'entities',
  'link_preview_options',
  'disable_notification',
  'protect_content',
  'allow_paid_broadcast',
  'suggested_post_parameters',
  'message_effect_id',
  'reply_parameters',
  'reply_markup',
  'reply_to_message_id',
] as const;

/**
 * Excluded from the generated Telegram override schema / editor autocomplete only. These keys are
 * resolved from Novu's subscriber routing and stored credentials at send time; omitting them from
 * the schema keeps autocomplete from suggesting them, but overrides may still set them (typed or
 * `_passthrough`) and they are not stripped on the send path.
 */
export const NON_OVERRIDABLE_TELEGRAM_KEYS = ['chat_id'] as const;

/** Telegram puts the compiled step body into `text`. */
export const TELEGRAM_PRIMARY_CONTENT_KEY = 'text';

/** Package subpath the full generated Telegram schema ships behind. */
export const TELEGRAM_OVERRIDE_SCHEMA_SUBPATH = '@novu/shared/provider-overrides/telegram';

/**
 * Hand-written twin of the generated WhatsApp schema's top-level shape, so key-level validation and
 * the provider registry never have to pull the generated artifact into a bundle.
 * `whatsapp-override.drift.spec.ts` fails if these drift apart.
 */
export const WHATSAPP_OVERRIDE_KEYS = [
  'audio',
  'contacts',
  'context',
  'document',
  'image',
  'interactive',
  'location',
  'reaction',
  'recipient_type',
  'sticker',
  'template',
  'text',
  'type',
  'video',
] as const;

/**
 * Excluded from the generated WhatsApp override schema / editor autocomplete only. These keys are
 * resolved from Novu's subscriber routing and stored credentials at send time; omitting them from
 * the schema keeps autocomplete from suggesting them, but overrides may still set them (typed or
 * `_passthrough`) and they are not stripped on the send path.
 */
export const NON_OVERRIDABLE_WHATSAPP_KEYS = ['messaging_product', 'to'] as const;

/** WhatsApp puts the compiled step body into `text.body`. */
export const WHATSAPP_PRIMARY_CONTENT_KEY = 'text.body';

/** Package subpath the full generated WhatsApp schema ships behind. */
export const WHATSAPP_OVERRIDE_SCHEMA_SUBPATH = '@novu/shared/provider-overrides/whatsapp';

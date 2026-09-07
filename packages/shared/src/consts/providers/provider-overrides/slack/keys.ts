/**
 * Hand-written twin of the generated Slack schema's top-level shape, so key-level validation and
 * the provider registry never have to pull the (very large) generated artifact into a bundle.
 * `slack-override.drift.spec.ts` fails if these drift apart.
 */
export const SLACK_OVERRIDE_KEYS = [
  'text',
  'reply_broadcast',
  'thread_ts',
  'icon_emoji',
  'username',
  'parse',
  'link_names',
  'metadata',
  'unfurl_links',
  'unfurl_media',
  'mrkdwn',
  'icon_url',
  'blocks',
  'attachments',
  'markdown_text',
] as const;

/**
 * Excluded from the generated Slack override schema / editor autocomplete only. These keys are
 * resolved from Novu's subscriber routing and stored credentials at send time; omitting them from
 * the schema keeps autocomplete from suggesting them, but overrides may still set them (typed or
 * `_passthrough`) and they are not stripped on the send path.
 */
export const NON_OVERRIDABLE_SLACK_KEYS = ['channel', 'token', 'as_user'] as const;

/** Slack puts the compiled step body into `text`. */
export const SLACK_PRIMARY_CONTENT_KEY = 'text';

/** Package subpath the full generated Slack schema ships behind. */
export const SLACK_OVERRIDE_SCHEMA_SUBPATH = '@novu/shared/provider-overrides/slack';

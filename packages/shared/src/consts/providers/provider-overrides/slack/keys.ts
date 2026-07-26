/**
 * Hand-written twin of the generated Slack schema's top-level shape, so key-level validation and
 * the provider registry never have to pull the (very large) generated artifact into a bundle.
 * `slack-override.drift.spec.ts` fails if these drift apart.
 */
export const SLACK_OVERRIDE_KEYS = [
  'text',
  'markdown_text',
  'blocks',
  'attachments',
  'username',
  'icon_emoji',
  'icon_url',
  'thread_ts',
  'reply_broadcast',
  'parse',
  'link_names',
  'metadata',
  'unfurl_links',
  'unfurl_media',
  'mrkdwn',
] as const;

/** Slack puts the compiled step body into `text`. */
export const SLACK_PRIMARY_CONTENT_KEY = 'text';

/** Package subpath the full generated Slack schema ships behind. */
export const SLACK_OVERRIDE_SCHEMA_SUBPATH = '@novu/shared/provider-overrides/slack';

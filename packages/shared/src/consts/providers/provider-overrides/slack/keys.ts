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
 * Resolved from Novu's subscriber routing and stored credentials, never from an override.
 * `bridgeProviderData` outranks the base body in `BaseProvider.transform()`, so an override
 * `channel` would silently redirect the message away from the subscriber it was addressed to,
 * and an override `token` would swap the integration credentials. `as_user` is excluded because
 * Novu always posts as the installed bot.
 *
 * Omitting these from the schema only raises a step issue, and step issues are advisory — they
 * flag a workflow without blocking the save. The send path strips them so the guarantee holds
 * regardless of how the override was written.
 */
export const NON_OVERRIDABLE_SLACK_KEYS = ['channel', 'token', 'as_user'] as const;

/** Slack puts the compiled step body into `text`. */
export const SLACK_PRIMARY_CONTENT_KEY = 'text';

/** Package subpath the full generated Slack schema ships behind. */
export const SLACK_OVERRIDE_SCHEMA_SUBPATH = '@novu/shared/provider-overrides/slack';

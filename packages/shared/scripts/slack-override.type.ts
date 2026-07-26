import type { ChatPostMessageArguments } from '@slack/web-api';

/**
 * `channel` and `token` are deliberately not overridable. `bridgeProviderData` outranks the base
 * body in `BaseProvider.transform()`, so an overridable `channel` key would silently hijack which
 * subscriber the message reaches, and an overridable `token` would swap the integration
 * credentials — both are security-relevant. They are resolved from Novu's subscriber routing and
 * stored credentials instead. `as_user` is dropped because Novu always posts as the installed bot.
 */
export type SlackOverride = Omit<ChatPostMessageArguments, 'channel' | 'token' | 'as_user'>;

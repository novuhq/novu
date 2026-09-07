/**
 * `@novu/js/ui-core`: the framework-neutral behaviour and styling of the Inbox.
 *
 * Both the Solid engine (`@novu/js/ui`) and host wrappers such as `@novu/react` build on this, so a block
 * looks and acts the same wherever it is rendered. Nothing here produces JSX.
 */
export type { MountHandle, OutletCleanup, OutletHandle } from './bridge/types';
export { isWebLocksSupported, requestLock } from './browser';
export { normalizeIntlLocale } from './format/normalizeIntlLocale';
export { formatSnoozedUntil, formatToRelativeTime } from './format/relativeTime';
export {
  createNotificationItemController,
  ISLAND_ATTRIBUTE,
  isInsideIsland,
  type NotificationItemController,
  type NotificationItemHandlers,
} from './item/controller';
export { parseMarkdownIntoTokens, type Token } from './markdown';
export { subscribeAccessor } from './reactivity';
export { type AppearanceStore, createAppearanceStore } from './stores/appearance';
export {
  type CountsFilter,
  type CountsStore,
  createCountsKey,
  createCountsStore,
  selectNewMessagesCount,
  type UnreadCount,
} from './stores/counts';
export { createNovuEventEffect, createWebSocketEventEffect } from './stores/events';
export {
  createInboxStore,
  createNavigate,
  DEFAULT_LIMIT,
  getTagsFromTab,
  type InboxStore,
  type Navigate,
} from './stores/inbox';
export {
  type AllLocalization,
  type AllLocalizationKey,
  createLocalizationStore,
  type InboxLocalization,
  type InboxLocalizationKey,
  type LocalizationStore,
  type StringLocalizationKey,
  type SubscriptionLocalization,
  type SubscriptionLocalizationKey,
  type TranslateFunction,
} from './stores/localization';
export { type ClassName, cn, generateRandomString, publicFacingTwMerge } from './style/cn';
export { NOVU_DEFAULT_CSS_ID, parseElements, parseVariables } from './style/css';
export { createAppearanceStylesheet, injectDefaultCss } from './style/inject';
export { type ResolveStyleArgs, resolveStyle, type StyleSource } from './style/resolveStyle';
export {
  badgeStyles,
  markdownStyles,
  notificationItemStyles,
  SEVERITY_TO_BAR_KEYS,
  SEVERITY_TO_NOTIFICATION_KEYS,
} from './style/tables';

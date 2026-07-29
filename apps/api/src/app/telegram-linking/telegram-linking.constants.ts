/**
 * Sentinel stored in Telegram start-code payloads and consumed on the
 * integration webhook when the integration is not linked to any agent.
 */
export const TELEGRAM_INTEGRATION_LINK_SCOPE = '__integration__';

export const SUBSCRIBER_LINK_SUCCESS_REPLY =
  "You're connected. Notifications from this integration will now reach you here.";
export const SUBSCRIBER_LINK_DUPLICATE_REPLY =
  'This chat is already connected to your account — no changes needed.';
export const SUBSCRIBER_LINK_INVALID_REPLY =
  "This connection link isn't valid — open a fresh link from your Novu dashboard and try again.";
export const SUBSCRIBER_LINK_EXPIRED_REPLY =
  'This connection link has expired. Open a new link from your Novu dashboard and try again.';
export const SUBSCRIBER_LINK_WRONG_BOT_REPLY =
  "This connection link wasn't issued for this bot. Open the link from your Novu dashboard again (or request a new one) and make sure you're messaging the same bot you configured.";

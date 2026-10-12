/**
 * What the agent's Slack app is and what the operator types to make one. No secrets and nothing
 * server-only in here: the setup drawer checks the fields with it and the server action checks them again.
 */

/** Slack's own limit for an app's name. */
export const SLACK_APP_NAME_MAX_LENGTH = 35;

/** Where an operator makes the App Configuration Token the app is created with. */
export const SLACK_APPS_URL = 'https://api.slack.com/apps';

export type SlackAppPermission = {
  scope: string;
  /** What the agent does with it, in a few words. */
  purpose: string;
  /** One of the handful the drawer always shows; the rest sit behind "show all". */
  main?: true;
};

/**
 * Every permission the app asks for when it's installed, which Slack lists again on its own page.
 * The scopes are `SLACK_AGENT_OAUTH_SCOPES` of `@novu/shared`, which the API builds the manifest from;
 * a scope added there needs a line here.
 */
export const SLACK_APP_PERMISSIONS: SlackAppPermission[] = [
  { scope: 'chat:write', purpose: 'Send asks with Approve / Deny buttons', main: true },
  { scope: 'im:write', purpose: 'Open a DM with the person it asks', main: true },
  { scope: 'im:history', purpose: 'Read their reply in that DM', main: true },
  { scope: 'users:read', purpose: 'Find people in your workspace', main: true },
  { scope: 'reactions:write', purpose: 'React when an answer is received', main: true },
  { scope: 'im:read', purpose: 'See the DMs it’s part of' },
  { scope: 'app_mentions:read', purpose: 'Notice when someone @mentions it' },
  { scope: 'assistant:write', purpose: 'Show up as an agent in Slack' },
  { scope: 'channels:read', purpose: 'See the public channels it was added to' },
  { scope: 'channels:history', purpose: 'Read messages in those public channels' },
  { scope: 'groups:read', purpose: 'See the private channels it was added to' },
  { scope: 'groups:history', purpose: 'Read messages in those private channels' },
  { scope: 'mpim:read', purpose: 'See the group DMs it was added to' },
  { scope: 'mpim:history', purpose: 'Read messages in those group DMs' },
  { scope: 'files:read', purpose: 'Open files people send it' },
  { scope: 'files:write', purpose: 'Send files' },
  { scope: 'reactions:read', purpose: 'See reactions to its messages' },
];

/** What's wrong with an app name, or `undefined` when Slack will take it. */
export function validateSlackAppName(name: string): string | undefined {
  const trimmed = name.trim();

  if (!trimmed) return 'Give the app a name.';
  if (trimmed.length > SLACK_APP_NAME_MAX_LENGTH) {
    return `Slack allows up to ${SLACK_APP_NAME_MAX_LENGTH} characters. This is ${trimmed.length}.`;
  }
  if (/slack/i.test(trimmed)) return 'Slack doesn’t allow the word “Slack” in an app’s name.';

  return undefined;
}

/**
 * What's wrong with a pasted App Configuration Token, or `undefined` when it looks like one. Slack has
 * several kinds of token and they're easy to mix up, so each wrong kind gets its own message. The same
 * checks as `human setup slack`.
 */
export function validateSlackConfigToken(token: string): string | undefined {
  const trimmed = token.trim();

  if (!trimmed) return 'Paste the App Configuration Token from Slack.';
  if (trimmed.startsWith('xoxb-')) return `That’s a bot token (xoxb-). ${EXPECTED_TOKEN}`;
  if (trimmed.startsWith('xapp-')) return `That’s an app-level token (xapp-). ${EXPECTED_TOKEN}`;
  if (trimmed.startsWith('xoxp-')) return `That’s a user token (xoxp-). ${EXPECTED_TOKEN}`;
  if (trimmed.startsWith('xoxe-')) return `That’s the refresh token (xoxe-). ${EXPECTED_TOKEN}`;
  if (!trimmed.startsWith('xoxe.')) return `That doesn’t look like the token. ${EXPECTED_TOKEN}`;

  return undefined;
}

const EXPECTED_TOKEN = 'Copy the access token; it starts with xoxe.xoxp-.';

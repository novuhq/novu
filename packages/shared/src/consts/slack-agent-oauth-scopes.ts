/**
 * Bot OAuth scopes for Slack apps used with Novu agents (manifest + OAuth authorize).
 * Single source of truth for API OAuth and dashboard Slack app manifest.
 */
export const SLACK_AGENT_OAUTH_SCOPES = [
  'app_mentions:read',
  'channels:history',
  'channels:read',
  'chat:write',
  'groups:history',
  'groups:read',
  'im:history',
  'im:read',
  'mpim:history',
  'mpim:read',
  'reactions:read',
  'reactions:write',
  'users:read',
] as const;

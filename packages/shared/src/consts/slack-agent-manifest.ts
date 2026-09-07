/**
 * Slack agent app manifest defaults for Novu agents (dashboard YAML + API quick-setup).
 * Uses the Agent messaging experience (`agent_view`); see Slack docs on migrating from `assistant_view`.
 */
export const SLACK_AGENT_DEFAULT_DESCRIPTION = 'Agent built with Novu';

/**
 * Bot Events API subscriptions for Slack agent apps.
 * Agent messaging experience: `app_home_opened` + `app_context_changed` replace assistant thread events.
 */
export const SLACK_AGENT_BOT_EVENTS = [
  'app_mention',
  'message.channels',
  'message.groups',
  'message.im',
  'message.mpim',
  'member_joined_channel',
  'app_home_opened',
  'app_context_changed',
  'reaction_added',
  'reaction_removed',
] as const;

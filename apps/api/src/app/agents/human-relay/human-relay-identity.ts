/** What a relay agent is called until its operator names it. */
export const HUMAN_RELAY_DEFAULT_NAME = 'Human';

export type HumanRelayProfile = {
  name?: string;
  description?: string;
};

/**
 * What a relay agent puts on a channel's own profile (a Telegram bot, a Slack app): only what its
 * operator chose. The default name and a missing description are left out, so they never replace what
 * the operator typed when making the bot or the app.
 */
export function humanRelayProfile(agent: { name?: string; description?: string }): HumanRelayProfile {
  const name = agent.name?.trim();
  const description = agent.description?.trim();

  return {
    ...(name && name !== HUMAN_RELAY_DEFAULT_NAME ? { name } : {}),
    ...(description ? { description } : {}),
  };
}

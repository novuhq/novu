/** Who can write to the agent: anyone (the default), or only its contacts. */
export type AgentReach = 'anyone' | 'contacts';

export const AGENT_REACHES: readonly AgentReach[] = ['anyone', 'contacts'];

/**
 * The agent is paused: mail keeps arriving, but its hosts can't read the inbox or send until it is resumed.
 * Only this dashboard pauses it.
 */
export type AgentPause = { at: string };

/**
 * The Settings block of the Configure page, as the API keeps it on the agent (`/v1/human/agent`). Only this
 * dashboard changes them; the API refuses the same changes from a host.
 */
export type AgentSettings = {
  reach: AgentReach;
  /** `null` while the agent isn't paused. */
  paused: AgentPause | null;
};

/** What an agent has before anyone changed its settings, and what an API from before them answers. */
export const DEFAULT_AGENT_SETTINGS: AgentSettings = { reach: 'anyone', paused: null };

/** One setting to change, as the Settings block sends it. */
export type AgentSettingsChange = { reach: AgentReach } | { paused: boolean };

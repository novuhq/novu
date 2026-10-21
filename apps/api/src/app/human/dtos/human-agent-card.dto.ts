/**
 * An agent's public card (`agentinbox.md/p/{handle}`): everything the card shows, and nothing else. Anyone can
 * read it without signing in.
 */
export type HumanAgentCardResult = {
  /** The handle the card is at, which is also its address before the `@`. */
  handle: string;
  /** The agent's name, or its handle with a capital while it still has the name `human setup` gave it. */
  name: string;
  /** Where anyone can load the agent's picture. Missing when it has none. */
  pictureUrl?: string;
  /** Whether its operator paused it. Mail keeps arriving, but the agent doesn't read it until it's resumed. */
  paused: boolean;
  /** The operator's first name and the initial of their last name: "Ada L.". Missing without a first name. */
  operatorName?: string;
  /** The operator's whole first name, for "Ada’s agent". There with `operatorName` only. */
  operatorFirstName?: string;
  /** When the agent was made, as an ISO timestamp. */
  createdAt: string;
  /** Its email address. */
  address: string;
  /** Its Telegram bot's username, without the `@`. Missing without a bot that Telegram answers for. */
  telegramBotUsername?: string;
};

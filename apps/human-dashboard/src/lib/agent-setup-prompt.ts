/**
 * The API the CLI talks to when it isn't told otherwise (`DEFAULT_API_URL` in `packages/agentinbox`): this
 * site's Agent Inbox API. The commands name their API only when it is another one: staging, or a local
 * dashboard while developing.
 */
const CLI_DEFAULT_API_URL = 'https://www.agentinbox.md/api';

const CLI = 'npx @agentinbox/cli';

export type PromptContext = {
  /** The Agent Inbox API the CLI reaches the account through (`readCliApiUrl`): this site's `/api`. */
  apiUrl: string;
};

/**
 * What the operator hands their agent in a channel's setup drawer ("Let your agent set this up"): a few
 * sentences that name the CLI commands and leave the steps in Telegram or Slack to the agent and the
 * operator. No API key in it: it ends up in another company's agent and its logs. A computer that isn't
 * logged in yet logs in first, since `channel add`
 * needs the login, and the operator may have set the agent up in the browser or through an MCP host.
 */
export function buildChannelPrompt(context: PromptContext, via: 'telegram' | 'slack', handle: string): string {
  const api = apiUrlFlag(context);
  const command = `${CLI} channel add ${via}${api}`;
  const login = `If Agent Inbox isn't logged in on this computer yet, first run ${CLI} login${api} and wait until I approve it in my browser.`;

  return via === 'telegram'
    ? `Set up Telegram for ${handle}. ${login} Then run ${command}, walk me through creating the bot with @BotFather and paste the token back.`
    : `Set up Slack for ${handle}. ${login} Then run ${command}, walk me through creating the app from the manifest and installing it.`;
}

/** The API's flag for a command, when the account's API isn't the one the CLI goes to by itself. */
export function apiUrlFlag({ apiUrl }: PromptContext): string {
  return apiUrl === CLI_DEFAULT_API_URL ? '' : ` --api-url=${apiUrl}`;
}

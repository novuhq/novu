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
 * sentences that name the CLI commands and leave the steps in Telegram or Slack to the operator, on the page
 * the agent gives them. No API key in it, and no token comes back through the chat: both would end up in
 * another company's agent and its logs. A computer that isn't logged in yet logs in first, since `channel add`
 * needs the login, and the operator may have set the agent up in the browser or through an MCP host. A host
 * that can't run commands has `channel_add` on the MCP server instead.
 */
export function buildChannelPrompt(
  context: PromptContext,
  via: 'telegram' | 'slack' | 'whatsapp',
  handle: string
): string {
  const api = apiUrlFlag(context);
  const command = `${CLI} channel add ${via}${api}`;
  const login = `If Agent Inbox isn't logged in on this computer yet, first run ${CLI} login${api} and wait until I approve it in my browser.`;

  if (via === 'whatsapp') {
    // The design's words, short enough to read at a glance: how to run `inbox`, log in, hand over the link, wait,
    // or use channel_add instead all live on /setup.md, which names this site's API when it isn't the public one.
    return `Turn on WhatsApp Business for ${handle}. Read ${setupDocOf(context)}, then run inbox channel add whatsapp. Send me the Meta link to connect my business account and number. Done when a message I send on WhatsApp shows up in ${handle}’s inbox.`;
  }

  const [channel, token] = via === 'telegram' ? ['Telegram', 'a bot token'] : ['Slack', 'a Slack token'];

  return `Set up ${channel} for ${handle}. ${login} Then run ${command} and give me the link it prints. If you can't run commands but have the channel_add tool, call it and give me the link it returns. I finish on that page, so never ask me for ${token}.`;
}

/**
 * Where a prompt sends the agent to read how setup goes: `agentinbox.md/setup.md` as the design writes it, or this
 * site's own page (`http://localhost:4300/setup.md`) when its API isn't the public one, since that page names it.
 */
export function setupDocOf({ apiUrl }: PromptContext): string {
  if (apiUrl === CLI_DEFAULT_API_URL) {
    return 'agentinbox.md/setup.md';
  }

  return `${apiUrl.replace(/\/api\/?$/, '')}/setup.md`;
}

/** The API's flag for a command, when the account's API isn't the one the CLI goes to by itself. */
export function apiUrlFlag({ apiUrl }: PromptContext): string {
  return apiUrl === CLI_DEFAULT_API_URL ? '' : ` --api-url=${apiUrl}`;
}

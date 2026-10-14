/**
 * The API the CLI talks to when it isn't told otherwise (`DEFAULT_API_URL` in `packages/agentinbox`). The
 * commands name their API only when it is another one: staging, a local API while developing, and the EU
 * API, which a key alone doesn't lead the CLI to.
 */
const CLI_DEFAULT_API_URL = 'https://api.novu.co';

const CLI = 'npx @agentinbox/cli';

export type PromptContext = {
  /** The API the account lives on. */
  apiUrl: string;
};

export type SetupContext = PromptContext & {
  /** The account's API key. Without it the operator logs in from the terminal instead. */
  secretKey: string | null;
};

export type SetupOperator = {
  name?: string;
  email?: string;
};

type Via = 'email' | 'telegram' | 'slack';

/**
 * The line the operator runs themselves, in their own terminal. It carries their API key, which the page
 * shows cut short. `setup` then asks them which channel to start with.
 */
export function buildSetupCommand(context: SetupContext): string {
  if (!context.secretKey) {
    return `${CLI} login${apiUrlFlag(context)} && ${CLI} setup`;
  }

  return `${CLI} setup${accountFlags(context)}`;
}

/** The same line with the key cut down to its end, for the screen. */
export function maskSetupCommand(command: string, secretKey: string | null): string {
  return secretKey ? command.replace(secretKey, `…${secretKey.slice(-4)}`) : command;
}

/**
 * What the operator pastes into Claude Code, Codex, Cursor or any other agent: it installs Agent Inbox, gives
 * the agent its own email address and asks before connecting anything else.
 *
 * The prompt never carries the account's API key. It ends up in another company's agent and its logs,
 * so the agent logs in with `login` instead, which the operator approves in their browser.
 */
export function buildSetupPrompt(context: PromptContext, operator: SetupOperator): string {
  const email = operator.email ? shellQuote(operator.email) : '<my email address>';
  const name = operator.name ? ` --name ${shellQuote(operator.name)}` : '';
  const api = apiUrlFlag(context);

  return [
    'Set up Agent Inbox for me. It is a CLI that lets you ask me questions and get my approval by email, Telegram or Slack while you work.',
    '',
    `1. Run \`${CLI} login${api}\`, show me the link it prints and wait until I approve it in my browser.`,
    `2. ${operator.email ? 'Run' : 'Ask me for my email address, then run'} this. It creates my agent inbox with its own email address, and installs the skill that tells you when to use it:`,
    `   ${CLI} setup email --email ${email}${name}${api} --skill`,
    '3. Tell me the email address the agent got.',
    '4. Ask me whether I also want Telegram or Slack. Connect only what I say yes to:',
    ...channelSteps(['telegram', 'slack'], api).map((step) => `   ${step}`),
  ].join('\n');
}

/**
 * What the operator hands their agent in a channel's setup drawer ("Let your agent set this up"): one
 * sentence that names the CLI command and leaves the steps in Telegram or Slack to the agent and the operator.
 * No API key in it either.
 */
export function buildChannelPrompt(context: PromptContext, via: 'telegram' | 'slack', handle: string): string {
  const command = `${CLI} channel add ${via}${apiUrlFlag(context)}`;

  return via === 'telegram'
    ? `Set up Telegram for ${handle}: run ${command}, then walk me through creating the bot with @BotFather and paste the token back.`
    : `Set up Slack for ${handle}: run ${command}, then walk me through creating the app from the manifest and installing it.`;
}

function channelSteps(channels: Via[], api: string): string[] {
  const steps: Record<Via, string> = {
    email: `- Email: ask me for my email address, then run \`${CLI} channel add email --email <my email address>${api}\`.`,
    telegram: `- Telegram: I create a bot with @BotFather and give you its token. Run \`${CLI} channel add telegram --telegram-bot-token <token>${api}\`, then show me the link it prints so I can press Start.`,
    slack: `- Slack: I create an App Configuration Token at https://api.slack.com/apps and give it to you. Run \`${CLI} channel add slack --slack-config-token <token>${api}\`, then show me the install link it prints.`,
  };

  return channels.map((via) => steps[via]);
}

function accountFlags(context: SetupContext): string {
  return `${context.secretKey ? ` --secret-key=${context.secretKey}` : ''}${apiUrlFlag(context)}`;
}

function apiUrlFlag({ apiUrl }: PromptContext): string {
  return apiUrl === CLI_DEFAULT_API_URL ? '' : ` --api-url=${apiUrl}`;
}

/** Single quotes keep a name such as O'Brien, or one with a `$` in it, from being read by the shell. */
function shellQuote(value: string): string {
  return `'${value.replace(/[\r\n]+/g, ' ').replace(/'/g, `'\\''`)}'`;
}

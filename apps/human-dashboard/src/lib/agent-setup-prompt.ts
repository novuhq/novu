/** The CLI's own default (`DEFAULT_API_URL` in `packages/human`); any other API has to be named. */
const CLI_DEFAULT_API_URL = 'https://api.novu.co';

const CLI = 'npx @novu/human';

export type SetupContext = {
  /** The account's API key. Without it the operator logs in from the terminal instead. */
  secretKey: string | null;
  /** The API the account lives on. */
  apiUrl: string;
};

export type SetupOperator = {
  name?: string;
  email?: string;
};

type Via = 'email' | 'telegram' | 'slack';

/** The line the operator runs themselves. `human setup` then asks them which channel to start with. */
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
 * What the operator pastes into Claude Code, Codex, Cursor or any other agent: it installs Human, gives
 * the agent its own email address and asks before connecting anything else.
 */
export function buildSetupPrompt(context: SetupContext, operator: SetupOperator): string {
  const email = operator.email ? shellQuote(operator.email) : '<my email address>';
  const name = operator.name ? ` --name ${shellQuote(operator.name)}` : '';

  return [
    'Set up Human for me. It is a CLI that lets you ask me questions and get my approval by email, Telegram or Slack while you work.',
    '',
    ...(context.secretKey
      ? []
      : [`0. Run \`${CLI} login${apiUrlFlag(context)}\` and wait until I approve it in my browser.`]),
    `1. ${operator.email ? 'Run' : 'Ask me for my email address, then run'} this. It creates my Human agent with its own email address, and installs the skill that tells you when to use it:`,
    `   ${CLI} setup email --email ${email}${name}${accountFlags(context)} --skill`,
    '2. Tell me the email address the agent got.',
    '3. Ask me whether I also want Telegram or Slack. Connect only what I say yes to:',
    ...channelSteps(['telegram', 'slack'], context).map((step) => `   ${step}`),
  ].join('\n');
}

/** The prompt for an agent that exists already: it connects the channels that are still missing. */
export function buildFinishSetupPrompt(context: SetupContext, missing: Via[]): string {
  return [
    'Connect more channels to my Human agent, so I can answer you where I already am.',
    '',
    ...(context.secretKey
      ? []
      : [`First run \`${CLI} login${apiUrlFlag(context)}\` and wait until I approve it in my browser.`, '']),
    `Ask me which of these I want: ${missing.map((via) => CHANNEL_NAMES[via]).join(', ')}. Connect only what I say yes to:`,
    ...channelSteps(missing, context),
  ].join('\n');
}

const CHANNEL_NAMES: Record<Via, string> = { email: 'Email', telegram: 'Telegram', slack: 'Slack' };

function channelSteps(channels: Via[], context: SetupContext): string[] {
  const flags = accountFlags(context);
  const steps: Record<Via, string> = {
    email: `- Email: ask me for my email address, then run \`${CLI} setup email --email <my email address>${flags}\`.`,
    telegram: `- Telegram: I create a bot with @BotFather and give you its token. Run \`${CLI} setup telegram --telegram-bot-token <token>${flags}\`, then show me the link it prints so I can press Start.`,
    slack: `- Slack: I create an App Configuration Token at https://api.slack.com/apps and give it to you. Run \`${CLI} setup slack --slack-config-token <token>${flags}\`, then show me the install link it prints.`,
  };

  return channels.map((via) => steps[via]);
}

function accountFlags(context: SetupContext): string {
  return `${context.secretKey ? ` --secret-key=${context.secretKey}` : ''}${apiUrlFlag(context)}`;
}

function apiUrlFlag({ apiUrl }: SetupContext): string {
  return apiUrl === CLI_DEFAULT_API_URL ? '' : ` --api-url=${apiUrl}`;
}

/** Single quotes keep a name such as O'Brien, or one with a `$` in it, from being read by the shell. */
function shellQuote(value: string): string {
  return `'${value.replace(/[\r\n]+/g, ' ').replace(/'/g, `'\\''`)}'`;
}

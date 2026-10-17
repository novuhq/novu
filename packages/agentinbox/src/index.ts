#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import { channelAddCommand, channelDefaultCommand, channelListCommand } from './commands/channels';
import { connectCommand } from './commands/connect';
import { contactsCommand } from './commands/contacts';
import { inboxListCommand, inboxReadCommand, inboxResolveCommand, inboxShowCommand } from './commands/inbox';
import { runSend } from './commands/interact';
import { inviteCommand } from './commands/invite';
import { loginCommand } from './commands/login';
import { setupCommand } from './commands/setup';
import { installSkillCommand } from './commands/skill';
import { CLI_COMMAND } from './config';

const program = new Command();

program
  .name(CLI_COMMAND)
  .description(
    'An inbox for your agent. People write to it on Telegram, Slack or email; it reads, asks and answers.\n\n' +
      'Every command is `<command> <action>`: setup, login, connect, inbox, contact, channel, skill.\n\n' +
      'Exit codes: 0 answered/approved · 10 denied · 11 timed out (the answer shows up in the conversation) · 12 expired/canceled · 1 error'
  )
  .version(version);

program.addHelpText(
  'after',
  '\nEnvironment variables (headless/containerized use, no config file needed):\n' +
    '  INBOX_SECRET_KEY  API secret key (takes priority over `login` and `setup`)\n' +
    '  INBOX_TO          default recipient: contact id(s), comma-separated (as --to)\n' +
    '  INBOX_VIA         default channel for INBOX_TO: telegram, slack, or email (as --via; ignored when --to names someone else)\n' +
    '  INBOX_API_URL     API URL override\n' +
    '  INBOX_CONFIG      config file path override\n' +
    'Precedence: CLI flags > environment variables > ~/.agentinbox/config.json\n'
);

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

/** The flags every send and reply takes; `send` adds `--to` and `--via`, `reply` adds `--to` and `--anyone`. */
function withSendOptions(command: Command): Command {
  return command
    .option('--from <name>', 'attribution label shown to the person (e.g. "deploy-bot")')
    .option('--ttl <duration>', 'time until a question expires (e.g. 90s, 10m, 2h; max 72h; default 24h)')
    .option('--timeout <duration>', 'max time to block waiting for an answer (default: until answered or expired)')
    .option('--async', 'return at once instead of waiting for an answer')
    .option('--option <label...>', 'choose: a choice (repeat for each option, 2-10). Also accepts id:label')
    .option('--approve-label <text>', 'approve: Approve button label')
    .option('--deny-label <text>', 'approve: Deny button label')
    .option('--extra-action <spec>', 'approve: extra button (`id:label` or label). Repeatable', collect, [])
    .option('--icon <id-or-url>', 'Slack-only card icon: MCP catalog id (`stripe`) or https URL')
    .option('--subtitle <text>', 'secondary line under the title')
    .option('--body <text>', 'supporting body text')
    .option('--json', 'print the full result as JSON')
    .option('--api-url <url>', 'API URL override');
}

const SEND_USAGE =
  'A plain message is sent without waiting. Start with ask, approve or choose to ask something and wait for the answer:\n' +
  '  ask <question>       a free-text question\n' +
  '  approve <action>     Approve and Deny buttons\n' +
  '  choose <question>    one of 2-10 options, given with --option';

// --- inbox ---

const inbox = program
  .command('inbox')
  .description(
    'Your agent’s conversations: read what people wrote, start a conversation or reply in one, and close it'
  );

inbox
  .command('list')
  .option('--filter <filter>', 'unread, read or all (default: all)')
  .option('--status <status>', 'open, resolved or all (default: open)')
  .option('--senders <senders>', 'contacts, or all to include conversations with strangers (default: contacts)')
  .option('--wait', 'block until a conversation matches the filters. Exit 11 when --timeout runs out')
  .option('--timeout <duration>', 'how long --wait blocks (e.g. 90s, 10m; default: forever)')
  .option('--limit <n>', 'max conversations per page (default 20, max 100)')
  .option('--after <cursor>', 'continue from the `next` cursor of a previous page')
  .option('--json', 'print JSON ({ data, next })')
  .option('--api-url <url>', 'API URL override')
  .description('List conversations, newest first. By default: open conversations with contacts, read and unread')
  .action(inboxListCommand);

inbox
  .command('show')
  .argument('<conversation>', 'conversation id (conv_...)')
  .option('--limit <n>', 'max messages (default 20, max 100)')
  .option('--before <messageId>', 'older messages, before this message id')
  .option('--json', 'print JSON ({ conversation, messages, hasMore })')
  .option('--api-url <url>', 'API URL override')
  .description('Show a conversation, oldest message first. Looking does not mark it read')
  .action(inboxShowCommand);

inbox
  .command('read')
  .argument('<conversation>', 'conversation id (conv_...)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'API URL override')
  .description('Mark a conversation read when it needs no reply')
  .action(inboxReadCommand);

inbox
  .command('resolve')
  .argument('<conversation>', 'conversation id (conv_...)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'API URL override')
  .description('Mark a conversation finished. Nothing is sent; it opens again when anyone writes in it')
  .action(inboxResolveCommand);

withSendOptions(
  inbox
    .command('send')
    .argument('<words...>', '[ask|approve|choose] and the text to send')
    .option(
      '--to <id|email>',
      'a contact, or comma-separated contacts (max 50; first valid answer wins). An email address that is not a contact yet becomes one (default: INBOX_TO, then you)'
    )
    .option(
      '--via <channel>',
      "deliver on a specific channel (telegram, slack, email) instead of each contact's default (env: INBOX_VIA, ignored when --to names someone else)"
    )
    .description(`Start a conversation. ${SEND_USAGE}`)
).action((words: string[], options) => runSend(words, options));

withSendOptions(
  inbox
    .command('reply')
    .argument('<conversation>', 'conversation id (conv_...)')
    .argument('<words...>', '[ask|approve|choose] and the text to send')
    .option('--to <id|email>', 'only these contacts may answer (default: the contact the conversation belongs to)')
    .option(
      '--anyone',
      'let anyone in the conversation answer, strangers included. The way to ask a stranger. Not with --to'
    )
    .description(`Send into an existing conversation. ${SEND_USAGE}`)
).action((conversation: string, words: string[], options) => runSend(words, options, conversation));

// --- contact ---

const contact = program.command('contact').description('The people your agent can reach with --to');

contact
  .command('list')
  .option('--limit <n>', 'max contacts per page (default: 50, max: 100)')
  .option('--after <cursor>', 'continue from the `next` cursor of a previous page')
  .option('--json', 'print JSON ({ data, next }; rows carry `self: true` for you; pass `next` to --after)')
  .option('--api-url <url>', 'API URL override')
  .description('List the contacts your agent can reach with --to')
  .action(contactsCommand);

contact
  .command('invite')
  .argument(
    '<id|email>',
    'id to give the new contact, used with --to; or their email address, which invites them on email'
  )
  .option(
    '--via <channel>',
    'skip the invite page and link them on one channel (telegram, slack, email); it becomes their default'
  )
  .option('--email <address>', 'their email address (required for --via email when not a TTY)')
  .option('--name <name>', 'their display name, e.g. "Alice Chen" (shown in `contact list`)')
  .option('--async', 'print the link and exit instead of waiting for them to connect')
  .option('--api-url <url>', 'API URL override')
  .description(
    'Get a link to share with a new contact: they connect Telegram, Slack or email on a page and pick their default'
  )
  .action(inviteCommand);

// --- channel ---

const channel = program.command('channel').description('Where your agent reaches you: Telegram, Slack or email');

channel
  .command('list')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'API URL override')
  .description('List the channels you connected and which one is your default')
  .action(channelListCommand);

channel
  .command('add')
  .argument('<channel>', 'channel to connect: telegram, slack, or email')
  .option('--telegram-bot-token <token>', 'BotFather token (skips the interactive prompt)')
  .option('--slack-config-token <token>', 'Slack App Configuration Token (skips the interactive prompt)')
  .option('--email <address>', 'your email address for the email channel (skips the interactive prompt)')
  .option('--api-url <url>', 'API URL override')
  .description('Connect one more channel to your setup')
  .action(channelAddCommand);

channel
  .command('default')
  .argument('<channel>', 'telegram, slack, or email')
  .option('--json', 'print JSON')
  .description('Set the channel used when a message goes to you')
  .action(channelDefaultCommand);

// --- setup, login, connect, skill ---

program
  .command('setup')
  .argument('[channel]', 'also link telegram or slack, or verify email on an account')
  .option('--api-url <url>', 'API URL override')
  .option('--secret-key <key>', 'use an existing Novu environment instead of keyless (self-hosted)')
  .option('--telegram-bot-token <token>', 'BotFather token (skips the paste-or-page prompt)')
  .option('--slack-config-token <token>', 'Slack App Configuration Token (skips the paste-or-page prompt)')
  .option('--email <address>', 'your email address for the email channel (skips the interactive prompt)')
  .option(
    '--name <name>',
    'your first and last name, e.g. "Nikita Grossman" — shown to people you invite (skips the first-run prompt)'
  )
  .option('--agent-name <name>', 'what your agent is called, as people see it')
  .option('--agent-description <text>', 'a line about what your agent does, shown with its name')
  .option('--agent-picture <file-or-url>', 'your agent’s picture: a JPEG or PNG of up to 2 MB (needs `login`)')
  .option('--agent-identifier <identifier>', 'relay agent identifier (default: human-relay)')
  .option('--skill', 'also install the agent-inbox skill for coding agents (default: prompt on a TTY)')
  .option('--no-skill', 'skip the coding-agent skill install')
  .description('Create your agent inbox, then optionally connect Telegram or Slack')
  .action(setupCommand);

program
  .command('login')
  .option('--api-url <url>', 'API URL override')
  .description(
    'Log in with your Agent Inbox account in the browser, so you never copy a secret key (keeps a setup made without an account)'
  )
  .action(loginCommand);

program
  .command('connect')
  .argument('<agent>', 'the agent to act as: its address before the @, e.g. atlas')
  .requiredOption('--code <code>', 'the one-time code from agentinbox.md, e.g. BCDF-GHJK (works once, for 10 minutes)')
  .option('--yes', 'replace a setup already on this computer without asking')
  .option('--api-url <url>', 'API URL override')
  .description('Connect this computer to an agent with a one-time code from agentinbox.md')
  .action(connectCommand);

const skill = program
  .command('skill')
  .description('Teach coding agents (Claude Code, Cursor, ...) how to use this CLI');

skill
  .command('install')
  .option(
    '--host <host...>',
    'install for specific hosts (claude, cursor, windsurf, copilot, gemini, roo, opencode, kiro, agents) — default: auto-detect'
  )
  .option('--cwd <dir>', 'project directory to install into (default: current directory)')
  .option('--json', 'print JSON')
  .description(
    'Install the agent-inbox skill so agents know how to read the inbox and when to send, reply, ask, approve or choose'
  )
  .action(installSkillCommand);

program.parse(process.argv);

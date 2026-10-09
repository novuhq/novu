#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import { agentShowCommand, agentUpdateCommand } from './commands/agent';
import { channelAddCommand, channelDefaultCommand, channelListCommand } from './commands/channels';
import { contactsCommand } from './commands/contacts';
import { inboxListCommand, inboxReadCommand, inboxResolveCommand, inboxShowCommand } from './commands/inbox';
import { runInteraction } from './commands/interact';
import { inviteCommand } from './commands/invite';
import { cancelCommand, listCommand, showInteractionCommand } from './commands/list';
import { loginCommand } from './commands/login';
import { setupCommand } from './commands/setup';
import { installSkillCommand } from './commands/skill';
import { waitCommand } from './commands/wait';

const program = new Command();

program
  .name('human')
  .description(
    'An inbox for your agent. People write to it on Telegram, Slack or email; it reads, asks and answers.\n\n' +
      'Every command is `human <thing> <action>`: inbox, interaction, agent, contact, channel, skill.\n\n' +
      'Exit codes: 0 answered/approved · 10 denied · 11 timed out (resume with `human interaction wait <id>`) · 12 expired/canceled · 1 error'
  )
  .version(version);

program.addHelpText(
  'after',
  '\nEnvironment variables (headless/containerized use, no config file needed):\n' +
    '  NOVU_SECRET_KEY    Novu API secret key (takes priority over `human login` and `human setup`)\n' +
    '  HUMAN_TO           default recipient subscriberId(s), comma-separated (as --to)\n' +
    '  HUMAN_VIA          default channel for HUMAN_TO: telegram, slack, or email (as --via; ignored when --to names someone else)\n' +
    '  NOVU_API_URL       Novu API URL override\n' +
    '  NOVU_HUMAN_CONFIG  config file path override\n' +
    'Precedence: CLI flags > environment variables > ~/.novu/human.json\n'
);

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function withCardOptions(command: Command, kind: 'ask' | 'approve' | 'choose' | 'tell'): Command {
  command
    .option('--icon <id-or-url>', 'Slack-only card icon: MCP catalog id (`stripe`) or https URL')
    .option('--subtitle <text>', 'secondary line under the title')
    .option('--body <text>', 'supporting body text');

  if (kind === 'approve') {
    command
      .option('--approve-label <text>', 'Approve button label')
      .option('--deny-label <text>', 'Deny button label')
      .option('--extra-action <spec>', 'extra approve button (`id:label` or label). Repeatable', collect, []);
  }

  return command;
}

function withCommonOptions(command: Command): Command {
  return command
    .option(
      '--to <contactId>',
      'a contact, or comma-separated contacts (max 50; first valid answer wins). Alone it starts a new thread; with --thread it limits who may answer (env: HUMAN_TO)'
    )
    .option(
      '--thread <id>',
      'send into an existing thread (conv_...). Anyone in it may answer unless --to is given. The way to reply to a stranger'
    )
    .option(
      '--via <platform>',
      "deliver on a specific linked channel (telegram, slack, email) instead of each contact's default. Not with --thread (env: HUMAN_VIA, ignored when --to names someone else)"
    )
    .option('--from <name>', 'attribution label shown to the human (e.g. "deploy-bot")')
    .option('--ttl <duration>', 'time until the request expires (e.g. 90s, 10m, 2h; max 72h; default 24h)')
    .option('--timeout <duration>', 'max time to block waiting (default: block until answered/expired)')
    .option('--async', 'return the interaction id immediately instead of blocking')
    .option('--json', 'print the full interaction object as JSON')
    .option('--api-url <url>', 'Novu API URL override');
}

// --- inbox ---

const inbox = program
  .command('inbox')
  .description('Your agent’s threads: read what people wrote, send into a thread or start one, and close it');

inbox
  .command('list')
  .option('--filter <filter>', 'unread, read or all (default: all)')
  .option('--status <status>', 'open, resolved or all (default: open)')
  .option('--senders <senders>', 'contacts, or all to include threads from strangers (default: contacts)')
  .option('--wait', 'block until a thread matches the filters. Exit 11 when --timeout runs out')
  .option('--timeout <duration>', 'how long --wait blocks (e.g. 90s, 10m; default: forever)')
  .option('--limit <n>', 'max threads per page (default 20, max 100)')
  .option('--after <id>', 'continue after this thread id (from a previous page)')
  .option('--json', 'print JSON ({ data, next })')
  .option('--api-url <url>', 'Novu API URL override')
  .description('List threads, newest first. By default: open threads from contacts, read and unread')
  .action(inboxListCommand);

inbox
  .command('show')
  .argument('<thread>', 'thread id (conv_...)')
  .option('--limit <n>', 'max messages (default 20, max 100)')
  .option('--before <messageId>', 'older messages, before this message id')
  .option('--json', 'print JSON ({ thread, messages, hasMore })')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Show a thread, oldest message first. Looking does not mark it read')
  .action(inboxShowCommand);

inbox
  .command('read')
  .argument('<thread>', 'thread id (conv_...)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Mark a thread read when it needs no reply')
  .action(inboxReadCommand);

inbox
  .command('resolve')
  .argument('<thread>', 'thread id (conv_...)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Mark a thread finished. Nothing is sent; it opens again when anyone writes in it')
  .action(inboxResolveCommand);

withCardOptions(
  withCommonOptions(
    inbox
      .command('ask')
      .argument('<question>', 'the question to ask')
      .description('Ask a freeform question and block until someone replies')
  ),
  'ask'
).action((question, options) => runInteraction('ask', question, options));

withCardOptions(
  withCommonOptions(
    inbox
      .command('approve')
      .argument('<action>', 'description of the action needing approval')
      .description('Ask for approval (Approve/Deny buttons) and block until decided')
  ),
  'approve'
).action((action, options) => runInteraction('approve', action, options));

withCardOptions(
  withCommonOptions(
    inbox
      .command('choose')
      .argument('<question>', 'the question to ask')
      .requiredOption('--option <label...>', 'a choice (repeat for each option, 2-10). Also accepts id:label')
      .description('Ask someone to pick one of several options')
  ),
  'choose'
).action((question, options) => runInteraction('choose', question, options));

withCardOptions(
  withCommonOptions(
    inbox
      .command('tell')
      .argument('<message>', 'the message to deliver')
      .description('Send a message without waiting. Plain text, or a card when --subtitle, --body or --icon is given')
  ),
  'tell'
).action((message, options) => runInteraction('tell', message, options));

// --- interaction ---

const interaction = program
  .command('interaction')
  .description('What your agent sent with ask, approve, choose or tell: list, look at, wait for or cancel one');

interaction
  .command('list')
  .option('--status <status>', 'filter by status (pending, answered, approved, denied, expired, canceled, delivered)')
  .option('--limit <n>', 'max results (default 20)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('List recent interactions')
  .action(listCommand);

interaction
  .command('show')
  .argument('<id>', 'interaction id (hi_...)')
  .option('--json', 'print the full interaction object as JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Show one interaction and its answer, without waiting')
  .action(showInteractionCommand);

interaction
  .command('wait')
  .argument('<id>', 'interaction id (hi_...)')
  .option('--timeout <duration>', 'max time to block waiting')
  .option('--json', 'print the full interaction object as JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Resume waiting on a pending interaction')
  .action(waitCommand);

interaction
  .command('cancel')
  .argument('<id>', 'interaction id (hi_...)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Cancel a pending interaction (disables its buttons)')
  .action(cancelCommand);

// --- agent ---

const agent = program
  .command('agent')
  .description('Who your agent is to the people it talks to: its name, description and picture');

agent
  .command('show')
  .argument('[id]', 'agent identifier (default: the agent this computer was set up with)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Show your agent’s name, description and picture')
  .action(agentShowCommand);

agent
  .command('update')
  .argument('[id]', 'agent identifier (default: the agent this computer was set up with)')
  .option('--name <name>', 'rename your agent')
  .option('--description <text>', 'describe what your agent does (pass "" to clear it)')
  .option('--picture <file-or-url>', 'give your agent a picture: a JPEG or PNG of up to 2 MB (needs `human login`)')
  .option('--remove-picture', 'take the picture away')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Change how your agent appears to people')
  .action(agentUpdateCommand);

// --- contact ---

const contact = program.command('contact').description('The people your agent can reach with --to');

contact
  .command('list')
  .option('--limit <n>', 'max contacts per page (default: 50, max: 100)')
  .option('--after <cursor>', 'continue from the `next` cursor of a previous page')
  .option('--json', 'print JSON ({ data, next }; rows carry `self: true` for you; pass `next` to --after)')
  .option('--api-url <url>', 'Novu API URL override')
  .description('List the contacts your agent can reach with --to')
  .action(contactsCommand);

contact
  .command('invite')
  .argument('<contactId>', 'id to give the new contact, used with --to (does not change your local identity)')
  .option(
    '--via <platform>',
    'skip the invite page and link them on one channel (telegram, slack, email); it becomes their default'
  )
  .option('--email <address>', 'their email address (required for --via email when not a TTY)')
  .option('--name <name>', 'their display name, e.g. "Alice Chen" (shown in `human contact list`)')
  .option('--async', 'print the link and exit instead of waiting for them to connect')
  .option('--api-url <url>', 'Novu API URL override')
  .description(
    'Get a link to share with a new contact: they connect Telegram or Slack on a page and pick their default (nothing is sent for you)'
  )
  .action(inviteCommand);

// --- channel ---

const channel = program.command('channel').description('Where your agent reaches you: Telegram, Slack or email');

channel
  .command('list')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('List the channels you connected and which one is your default')
  .action(channelListCommand);

channel
  .command('add')
  .argument('<channel>', 'channel to connect: telegram, slack, or email')
  .option('--telegram-bot-token <token>', 'BotFather token (skips the interactive prompt)')
  .option('--slack-config-token <token>', 'Slack App Configuration Token (skips the interactive prompt)')
  .option('--email <address>', 'your email address for the email channel (skips the interactive prompt)')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Connect one more channel to your setup')
  .action(channelAddCommand);

channel
  .command('default')
  .argument('<channel>', 'telegram, slack, or email')
  .option('--json', 'print JSON')
  .description('Set the channel used when a message goes to you')
  .action(channelDefaultCommand);

// --- setup, login, skill ---

program
  .command('login')
  .option('--api-url <url>', 'Novu API URL override')
  .description(
    'Log in with your Human account in the browser, so you never copy a secret key (keeps a setup made without an account)'
  )
  .action(loginCommand);

program
  .command('setup')
  .argument('[channel]', 'channel to link: telegram, slack, or email (interactive picker when omitted)')
  .option('--api-url <url>', 'Novu API URL override')
  .option('--secret-key <key>', 'use an existing Novu environment instead of keyless')
  .option('--telegram-bot-token <token>', 'BotFather token (skips the interactive prompt)')
  .option('--slack-config-token <token>', 'Slack App Configuration Token (skips the interactive prompt)')
  .option('--email <address>', 'your email address for the email channel (skips the interactive prompt)')
  .option('--name <name>', 'your name, shown to agents (skips the first-run prompt)')
  .option('--agent-name <name>', 'what your agent is called, as people see it (default: Human)')
  .option('--agent-description <text>', 'a line about what your agent does, shown with its name')
  .option('--agent-picture <file-or-url>', 'your agent’s picture: a JPEG or PNG of up to 2 MB (needs `human login`)')
  .option('--agent-identifier <identifier>', 'relay agent identifier (default: human-relay)')
  .option('--skill', 'also install the human-cli skill for coding agents (default: prompt on a TTY)')
  .option('--no-skill', 'skip the coding-agent skill install')
  .description('Connect yourself as the human and link your first channel (more: `human channel add`)')
  .action(setupCommand);

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
    'Install the human-cli skill so agents know how to read the inbox and when to ask, approve, choose or tell'
  )
  .action(installSkillCommand);

program.parse(process.argv);

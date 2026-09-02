#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import { channelsCommand } from './commands/channels';
import { contactsCommand } from './commands/contacts';
import { runInteraction } from './commands/interact';
import { inviteCommand } from './commands/invite';
import { cancelCommand, listCommand } from './commands/list';
import { setupCommand } from './commands/setup';
import { installSkillCommand } from './commands/skill';
import { waitCommand } from './commands/wait';

const program = new Command();

program
  .name('human')
  .description(
    'The human API for agents. Ask a human, get an answer — on Telegram or Slack.\n\n' +
      'Exit codes: 0 answered/approved · 10 denied · 11 timed out (resume with `human wait <id>`) · 12 expired/canceled · 1 error'
  )
  .version(version);

program.addHelpText(
  'after',
  '\nEnvironment variables (headless/containerized use, no config file needed):\n' +
    '  NOVU_SECRET_KEY    Novu API secret key (replaces `human setup` auth)\n' +
    '  HUMAN_TO           default recipient subscriberId(s), comma-separated (as --to)\n' +
    '  HUMAN_VIA          default channel: telegram, slack, or email (as --via)\n' +
    '  NOVU_API_URL       Novu API URL override\n' +
    '  NOVU_HUMAN_CONFIG  config file path override\n' +
    'Precedence: CLI flags > environment variables > ~/.novu/human.json\n'
);

function withCommonOptions(command: Command): Command {
  return command
    .option(
      '--to <humanId>',
      'address a linked human, or comma-separated humans (max 50; first valid answer wins; link others with `human invite`) (env: HUMAN_TO)'
    )
    .option(
      '--via <platform>',
      'deliver on a specific linked channel (telegram, slack, email) instead of the default (env: HUMAN_VIA)'
    )
    .option('--from <name>', 'attribution label shown to the human (e.g. "deploy-bot")')
    .option('--ttl <duration>', 'time until the request expires (e.g. 90s, 10m, 2h; max 72h; default 24h)')
    .option('--timeout <duration>', 'max time to block waiting (default: block until answered/expired)')
    .option('--async', 'return the interaction id immediately instead of blocking')
    .option('--json', 'print the full interaction object as JSON')
    .option('--api-url <url>', 'Novu API URL override');
}

withCommonOptions(
  program
    .command('ask')
    .argument('<question>', 'the question to ask')
    .description('Ask the human a freeform question and block until they reply')
).action((question, options) => runInteraction('ask', question, options));

withCommonOptions(
  program
    .command('approve')
    .argument('<action>', 'description of the action needing approval')
    .description('Ask for approval (Approve/Deny buttons) and block until decided')
).action((action, options) => runInteraction('approve', action, options));

withCommonOptions(
  program
    .command('choose')
    .argument('<question>', 'the question to ask')
    .requiredOption('--option <label...>', 'a choice (repeat for each option, 2-10)')
    .description('Ask the human to pick one of several options')
).action((question, options) => runInteraction('choose', question, options));

withCommonOptions(
  program
    .command('tell')
    .argument('<message>', 'the message to deliver')
    .description('Send a one-way notification (no waiting)')
).action((message, options) => runInteraction('tell', message, options));

program
  .command('wait')
  .argument('<id>', 'interaction id (hi_...)')
  .option('--timeout <duration>', 'max time to block waiting')
  .option('--json', 'print the full interaction object as JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Resume waiting on a pending interaction')
  .action(waitCommand);

program
  .command('list')
  .option('--status <status>', 'filter by status (pending, answered, approved, denied, expired, canceled, delivered)')
  .option('--limit <n>', 'max results (default 20)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('List recent interactions')
  .action(listCommand);

program
  .command('cancel')
  .argument('<id>', 'interaction id (hi_...)')
  .option('--json', 'print JSON')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Cancel a pending interaction (disables its buttons)')
  .action(cancelCommand);

program
  .command('setup')
  .argument('[channel]', 'channel to link: telegram, slack, or email (interactive picker when omitted)')
  .option('--api-url <url>', 'Novu API URL override')
  .option('--secret-key <key>', 'use an existing Novu environment instead of keyless')
  .option('--telegram-bot-token <token>', 'BotFather token (skips the interactive prompt)')
  .option('--slack-config-token <token>', 'Slack App Configuration Token (skips the interactive prompt)')
  .option('--email <address>', 'your email address for the email channel (skips the interactive prompt)')
  .option('--name <name>', 'your name, shown to agents (skips the first-run prompt)')
  .option('--agent-identifier <identifier>', 'relay agent identifier (default: human-relay)')
  .option('--skill', 'also install the human-cli skill for coding agents (default: prompt on a TTY)')
  .option('--no-skill', 'skip the coding-agent skill install')
  .description('Connect yourself as the human — links a channel (run again to add more)')
  .action(setupCommand);

program
  .command('invite')
  .argument('<humanId>', 'subscriberId of the human to link (does not change your local identity)')
  .option(
    '--via <platform>',
    'channel to link them on (telegram, slack, email). Required when several channels are linked.'
  )
  .option('--email <address>', 'their email address (required for --via email when not a TTY)')
  .option('--name <name>', 'their display name, e.g. "Alice Chen" (shown in `human contacts`)')
  .option('--async', 'print the connect URL and exit instead of waiting for them to finish')
  .option('--api-url <url>', 'Novu API URL override')
  .description('Link another human to a channel (sends them a Slack/Telegram connect URL)')
  .action(inviteCommand);

program
  .command('contacts')
  .option('--limit <n>', 'max contacts per page (default: 50, max: 100)')
  .option('--after <cursor>', 'continue from the `next` cursor of a previous page')
  .option('--json', 'print JSON ({ data, next }; rows carry `self: true` for you; pass `next` to --after)')
  .option('--api-url <url>', 'Novu API URL override')
  .description('List humans (subscribers) agents can reach with --to')
  .action(contactsCommand);

program
  .command('channels')
  .option('--default <platform>', 'switch the default channel')
  .option('--json', 'print JSON')
  .description('Show or set the default delivery channel preference')
  .action(channelsCommand);

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
  .description('Install the human-cli skill so agents know when to ask/approve/choose/tell')
  .action(installSkillCommand);

program.parse(process.argv);

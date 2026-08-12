#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import { runInteraction } from './commands/interact';
import { cancelCommand, listCommand } from './commands/list';
import { setupCommand } from './commands/setup';
import { waitCommand } from './commands/wait';

const program = new Command();

program
  .name('human')
  .description(
    'The human API for agents. Ask a human, get an answer — on Telegram or Slack.\n\n' +
      'Exit codes: 0 answered/approved · 10 denied · 11 timed out (resume with `human wait <id>`) · 12 expired/canceled · 1 error'
  )
  .version(version);

function withCommonOptions(command: Command): Command {
  return command
    .option('--to <humanId>', 'address a specific human (defaults to the human from `human setup`)')
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
  .option('--api-url <url>', 'Novu API URL override')
  .option('--secret-key <key>', 'use an existing Novu environment instead of keyless')
  .option('--telegram-bot-token <token>', 'BotFather token (skips the interactive prompt)')
  .option('--agent-identifier <identifier>', 'relay agent identifier (default: human-relay)')
  .description('Connect yourself as the human — creates the relay and links Telegram')
  .action(setupCommand);

program.parse(process.argv);

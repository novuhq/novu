#!/usr/bin/env node

import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { DevCommandOptions, devCommand } from './commands';
import { connectCommand } from './commands/connect';
import { isDashboardOnlyChannel } from './commands/connect/dashboard-urls';
import { CONNECT_HELP_TEXT } from './commands/connect/help-text';
import type { ConnectCommandInput } from './commands/connect/resolve-options';
import { resolveConnectCommandOptions } from './commands/connect/resolve-options';
import {
  AGENT_RUNTIME_CHOICES,
  type AgentRuntimeChoice,
  CHANNEL_CHOICES,
  type ChannelChoice,
} from './commands/connect/types';
import { CloudRegionEnum } from './commands/dev/enums';
import { IInitCommandOptions, init } from './commands/init';
import { stepPublish } from './commands/step';
import { sync } from './commands/sync';
import { pullTranslations, pushTranslations } from './commands/translations';
// Wizard command is parked while we ship Connect. Re-enable by uncommenting
// these imports + the `program.command('wizard')` block below.
// import { wizardCommand } from './commands/wizard';
// import { WizardCommandOptions } from './commands/wizard/types';
import { NOVU_API_URL, NOVU_SECRET_KEY } from './constants';
import { AnalyticService, ConfigService } from './services';

const analytics = new AnalyticService();
export const config = new ConfigService();
if (process.env.NODE_ENV === 'development') {
  config.clearStore();
}
const anonymousIdLocalState = config.getValue('anonymousId');
const anonymousId = anonymousIdLocalState || uuidv4();
if (!anonymousIdLocalState) {
  config.setValue('anonymousId', anonymousId);
}
const program = new Command();

program.name('novu').description(`A CLI tool to interact with Novu Cloud`);

program
  .command('sync')
  .description(
    `Sync your state with Novu Cloud

  Specifying the Bridge URL and Secret Key:
  (e.g., npx novu@latest sync -b https://acme.org/api/novu -s NOVU_SECRET_KEY)

  Sync with Novu Cloud in Europe:
  (e.g., npx novu@latest sync -b https://acme.org/api/novu -s NOVU_SECRET_KEY -a https://eu.api.novu.co)`
  )
  .usage('-b <url> -s <secret-key> [-a <url>]')
  .option('-a, --api-url <url>', 'The Novu Cloud API URL', NOVU_API_URL || 'https://api.novu.co')
  .requiredOption(
    '-b, --bridge-url <url>',
    'The Novu endpoint URL hosted in the Bridge application, by convention ends in /api/novu'
  )
  .requiredOption(
    '-s, --secret-key <secret-key>',
    'The Novu Secret Key. Obtainable at https://dashboard.novu.co/api-keys',
    NOVU_SECRET_KEY || ''
  )
  .action(async (options) => {
    analytics.track({
      identity: {
        anonymousId,
      },
      data: {},
      event: 'Sync Novu Endpoint State',
    });
    await sync(options.bridgeUrl, options.secretKey, options.apiUrl);
  });

program
  .command('dev')
  .description(
    `Start Novu Studio and a local tunnel

  Running the Bridge application on port 4000: 
  (e.g., npx novu@latest dev -p 4000)

  Running the Bridge application on a different route: 
  (e.g., npx novu@latest dev -r /v1/api/novu)
  
  Running with a custom tunnel:
  (e.g., npx novu@latest dev --tunnel https://my-tunnel.ngrok.app)`
  )
  .usage('[-p <port>] [-r <route>] [-o <origin>] [-d <dashboard-url>] [-sp <studio-port>] [-t <url>] [-H]')
  .option('-p, --port <port>', 'The local Bridge endpoint port', '4000')
  .option('-r, --route <route>', 'The Bridge endpoint route', '/api/novu')
  .option('-o, --origin <origin>', 'The Bridge endpoint origin')
  .option('-d, --dashboard-url <url>', 'The Novu Cloud Dashboard URL', 'https://dashboard.novu.co')
  .option('-sp, --studio-port <port>', 'The Local Studio server port', '2022')
  .option('-sh, --studio-host <host>', 'The Local Studio server host', 'localhost')
  .option('-t, --tunnel <url>', 'Self hosted tunnel. e.g. https://my-tunnel.ngrok.app')
  .option('-H, --headless', 'Run the Bridge in headless mode without opening the browser', false)
  .option('--no-studio', 'Skip starting the local Studio server')
  .option('--run <command>', 'Spawn a local app server before opening the tunnel')
  .action(async (options: DevCommandOptions) => {
    analytics.track({
      identity: {
        anonymousId,
      },
      data: {},
      event: 'Open Dev Server',
    });

    return await devCommand(options, anonymousId);
  });

// Wizard command parked — shipping Connect first, will re-enable in a
// follow-up. Restoring is uncommenting this block + the two imports above.
// program
//   .command('wizard')
//   .description('Integrate Novu into your app with an autonomous AI agent (beta)')
//   .option('-s, --secret-key <secret-key>', 'Skip browser auth and use this Novu Secret Key')
//   .option('-a, --api-url <url>', 'Novu Cloud API URL', NOVU_API_URL || 'https://api.novu.co')
//   .option('-d, --dashboard-url <url>', 'Novu Cloud Dashboard URL', 'https://dashboard.novu.co')
//   .option('--mcp-url <url>', 'Override the Novu MCP server URL (default: https://mcp.novu.co/)')
//   .option('--region <region>', `Novu region (${Object.values(CloudRegionEnum).join(' | ')})`, CloudRegionEnum.US)
//   .option('--model <model>', 'Override default model')
//   .option('--goal <goal>', 'Default wizard goal: full | inbox | workflows (default: full)', 'full')
//   .option('--yes', 'Skip the bootstrap countdown and auto-pick the first detected MCP editor', false)
//   .option('--ci', 'Force non-interactive logging mode (no Bootstrap countdown, no MCP picker)', false)
//   .option('--skills-branch <branch>', 'Override the novuhq/skills git branch/tag/commit to install (default: main)')
//   .option('--debug', 'Show per-phase and per-todo durations in the UI and log a timing summary on exit', false)
//   .action(async (options: WizardCommandOptions) => {
//     analytics.track({
//       identity: {
//         anonymousId,
//       },
//       data: {},
//       event: 'Run Novu Wizard Command',
//     });
//     await wizardCommand(options, anonymousId);
//   });

program
  .command('connect')
  .description(
    `Create a managed agent and connect it to a channel (keyless by default; use --ci for non-interactive agent/CI runs)`
  )
  .usage('[prompt] [--ci] [--channel <name>] [options]')
  .argument(
    '[prompt]',
    'Agent description. Required in --ci mode. When provided, skips the picker and creates a new agent from this prompt.'
  )
  .option(
    '-s, --secret-key <secret-key>',
    'Use an existing Novu account instead of keyless mode (omit for keyless — the default)'
  )
  .option('-a, --api-url <url>', 'Override the Novu API URL (default follows --region)')
  .option('-d, --dashboard-url <url>', 'Override the Novu Dashboard URL (default follows --region)')
  .option(
    '--connect-dashboard-url <url>',
    'Override the Connect browser-auth URL (default follows --region, e.g. dashboard.novu.co)'
  )
  .option('--region <region>', `Novu region (${Object.values(CloudRegionEnum).join(' | ')})`, CloudRegionEnum.US)
  .option(
    '--prompt <text>',
    'Pre-fill the agent description (alternative to positional <prompt>; positional wins when both are set)'
  )
  .option(
    '--runtime <runtime>',
    `Agent runtime for new agents (${AGENT_RUNTIME_CHOICES.join(' | ')}). Defaults to demo — omit in --ci keyless runs`
  )
  .option(
    '--agent-integration-id <id>',
    'Use an existing agent-runtime integration (skips credential setup for BYOK runtimes)'
  )
  .option('--anthropic-api-key <key>', 'Anthropic API key for --runtime claude non-interactive runs')
  .option('--aws-claude-api-key <key>', 'AWS Claude API key for --runtime claude-aws non-interactive runs')
  .option('--aws-claude-region <region>', 'AWS Claude commercial region for --runtime claude-aws')
  .option('--aws-claude-workspace-id <id>', 'AWS Claude workspace ID for --runtime claude-aws')
  .option(
    '--channel <name>',
    `Channel to connect (required in --ci mode). One of: ${CHANNEL_CHOICES.join(', ')}. whatsapp/teams are dashboard-only — do not pass them in --ci mode`
  )
  .option('--skip-slack', 'Create the agent and exit; do not connect any channel (equivalent to --channel skip)', false)
  .option(
    '--slack-config-token <token>',
    'Slack App Configuration Token (xoxe.xoxp-…). CI-only escape hatch — omit to use the secure setup page'
  )
  .option(
    '--telegram-bot-token <token>',
    'Telegram bot token from @BotFather (123456:ABC-…). CI-only escape hatch — omit to use the secure setup page'
  )
  .option(
    '--ci',
    'Non-interactive mode (no Ink TUI). Requires a prompt (positional <prompt> or --prompt) and --channel; see examples below',
    false
  )
  .addHelpText('after', CONNECT_HELP_TEXT)
  .showHelpAfterError('(run `novu connect --help` for the non-interactive contract and examples)')
  .action(async (positionalPrompt: string | undefined, options: ConnectCommandInput) => {
    analytics.track({
      identity: {
        anonymousId,
      },
      data: {},
      event: 'Run Novu Connect Command',
    });
    // Positional `prompt` wins over `--prompt` (the positional form is the
    // primary surface; the flag exists for parity with `--ci` workflows).
    if (options.ci) {
      const prompt = (positionalPrompt ?? options.prompt)?.trim();
      const channel = options.skipSlack ? 'skip' : options.channel;

      if (!prompt) {
        console.error(
          'Non-interactive mode requires a prompt (positional <prompt> or --prompt).\n(run `novu connect --help` for the non-interactive contract and examples)'
        );
        process.exit(1);
      }

      if (!channel) {
        console.error(
          'Non-interactive mode requires --channel <slack|email|telegram|skip>.\n(run `novu connect --help` for the non-interactive contract and examples)'
        );
        process.exit(1);
      }

      if (options.channel && isDashboardOnlyChannel(options.channel as ChannelChoice)) {
        console.error(
          'Non-interactive mode does not support --channel whatsapp or --channel teams. Use the Novu dashboard instead.\n(run `novu connect --help` for the non-interactive contract and examples)'
        );
        process.exit(1);
      }
    }

    if (options.channel && !(CHANNEL_CHOICES as readonly string[]).includes(options.channel)) {
      console.error(`Invalid --channel value: "${options.channel}". Expected one of: ${CHANNEL_CHOICES.join(', ')}.`);
      process.exit(1);
    }
    if (options.runtime && !(AGENT_RUNTIME_CHOICES as readonly string[]).includes(options.runtime)) {
      console.error(
        `Invalid --runtime value: "${options.runtime}". Expected one of: ${AGENT_RUNTIME_CHOICES.join(', ')}.`
      );
      process.exit(1);
    }
    let resolved: ReturnType<typeof resolveConnectCommandOptions>;
    try {
      resolved = resolveConnectCommandOptions({
        ...options,
        region: options.region as CloudRegionEnum,
        prompt: positionalPrompt ?? options.prompt,
        channel: options.channel as ChannelChoice | undefined,
        runtime: options.runtime as AgentRuntimeChoice | undefined,
        apiUrl: options.apiUrl ?? NOVU_API_URL,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    }
    await connectCommand(resolved, anonymousId);
  });

program
  .command('init')
  .description(`Create a new Novu application`)
  .option(
    '-s, --secret-key <secret-key>',
    `The Novu development environment Secret Key. Note that your Novu app won't work outside of local mode without it.`
  )
  .option('-a, --api-url <url>', 'The Novu Cloud API URL', 'https://api.novu.co')
  .option('-t, --template <name>', 'The template to use (notifications or agent)')
  .option('--agent-identifier <id>', 'Agent identifier to use in the scaffolded template')
  .action(async (options: IInitCommandOptions) => {
    return await init(options, anonymousId);
  });

const translationsCommand = program.command('translations').description('Manage Novu translations');

translationsCommand
  .command('pull')
  .description('Pull all translation files from Novu Cloud')
  .option('-s, --secret-key <secret-key>', 'The Novu Secret Key', NOVU_SECRET_KEY || '')
  .option('-a, --api-url <url>', 'The Novu Cloud API URL', NOVU_API_URL || 'https://api.novu.co')
  .option('-d, --directory <path>', 'Directory to save translation files', './translations')
  .action(async (options) => {
    analytics.track({
      identity: {
        anonymousId,
      },
      data: {},
      event: 'Pull Translations',
    });
    await pullTranslations(options);
  });

translationsCommand
  .command('push')
  .description('Push translation files to Novu Cloud')
  .option('-s, --secret-key <secret-key>', 'The Novu Secret Key', NOVU_SECRET_KEY || '')
  .option('-a, --api-url <url>', 'The Novu Cloud API URL', NOVU_API_URL || 'https://api.novu.co')
  .option('-d, --directory <path>', 'Directory containing translation files', './translations')
  .action(async (options) => {
    analytics.track({
      identity: {
        anonymousId,
      },
      data: {},
      event: 'Push Translations',
    });
    await pushTranslations(options);
  });

const stepCommand = program.command('step').description('Manage Novu step resolvers');

stepCommand
  .command('publish')
  .description('Bundle and deploy step handlers to Novu')
  .option('-s, --secret-key <key>', 'Novu API secret key', NOVU_SECRET_KEY || '')
  .option('-a, --api-url <url>', 'Novu API URL')
  .option('-c, --config <path>', 'Path to config file')
  .option('--out <path>', 'Directory containing step handlers')
  .option('--workflow <id...>', 'Deploy only specific workflows')
  .option('--step <id...>', 'Deploy only specific steps (requires --workflow)')
  .option(
    '--template <path>',
    'Path to React Email template; scaffolds a React Email email handler if it does not exist'
  )
  .option('--bundle-out-dir [path]', 'Write bundled workflow artifacts to a directory for debugging')
  .option('--dry-run', 'Bundle without deploying')
  .action(async (options) => {
    analytics.track({
      identity: {
        anonymousId,
      },
      data: {},
      event: 'Step Publish Command',
    });
    await stepPublish(options);
  });

program.parse(process.argv);

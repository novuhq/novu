#!/usr/bin/env node

import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { DevCommandOptions, devCommand } from './commands';
import { IInitCommandOptions, init } from './commands/init';
import { stepPublish } from './commands/step';
import { sync } from './commands/sync';
import { pullTranslations, pushTranslations } from './commands/translations';
import { NOVU_API_URL, NOVU_SECRET_KEY } from './constants';
import { AnalyticService, ConfigService } from './services';

const analytics = new AnalyticService();
export const config = new ConfigService();
if (process.env.NODE_ENV === 'development') {
  config.clearStore();
}
const anonymousIdLocalState = config.getValue('anonymousId');
const anonymousId = anonymousIdLocalState || uuidv4();
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

program
  .command('init')
  .description(`Create a new Novu application`)
  .option(
    '-s, --secret-key <secret-key>',
    `The Novu development environment Secret Key. Note that your Novu app won't work outside of local mode without it.`
  )
  .option('-a, --api-url <url>', 'The Novu Cloud API URL', 'https://api.novu.co')
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

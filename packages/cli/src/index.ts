#!/usr/bin/env node

import { Command } from 'commander';
import { devCommand, DevCommandOptions } from './commands';
import { sync } from './commands/sync';

import { v4 as uuidv4 } from 'uuid';
import { AnalyticService, ConfigService } from './services';

const analytics = new AnalyticService();
const config = new ConfigService();
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
  .option('-a, --api-url <url>', 'The Novu Cloud API URL', 'https://api.novu.co')
  .requiredOption(
    '-b, --bridge-url <url>',
    'The Novu endpoint URL hosted in the Bridge application, by convention ends in /api/novu'
  )
  .requiredOption(
    '-s, --secret-key <secret-key>',
    'The Novu Secret Key. Obtainable at https://dashboard.novu.co/api-keys'
  )
  .action(async (options) => {
    analytics.track({
      identity: {
        anonymousId: anonymousId,
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
  (e.g., npx novu@latest dev -r /v1/api/novu)`
  )
  .usage('[-p <port>] [-r <route>] [-o <origin>] [-d <dashboard-url>] [-sp <studio-port>]')
  .option('-p, --port <port>', 'The local Bridge endpoint port', '4000')
  .option('-r, --route <route>', 'The Bridge endpoint route', '/api/novu')
  .option('-o, --origin <origin>', 'The Bridge endpoint origin')
  .option('-d, --dashboard-url <url>', 'The Novu Cloud Dashboard URL', 'https://dashboard.novu.co')
  .option('-sp, --studio-port <port>', 'The Local Studio server port', '2022')
  .action((options: DevCommandOptions) => devCommand(options));

program.parse(process.argv);

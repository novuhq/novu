#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand, devCommand, DevCommandOptions } from './commands';
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

program.name('novu').description('A CLI tool to interact with the novu API');

program
  .command('init')
  .description('Initialize a new project and create an account')
  .action(() => {
    initCommand();
  });

program
  .command('sync')
  .option('-a, --api-url <apiUrl>', 'The Novu Cloud API URL, 'https://api.novu.co')
  .requiredOption(
    '-b, --bridge-url <bridgeUrl>',
    'The Novu endpoint URL hosted in the Bridge application, by convention ends in /api/novu'
  )
  .requiredOption('-s, --secret-key <secretKey>', 'The Novu secret key')
  .description('Sync your state with Novu Cloud')
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
  .description('Start a Novu Dev Studio and a localtunnel')
  .option('-p, --port <value>', 'Set the local port for the Novu endpoint, defaults to 4000', '4000')
  .option('-r, --route <value>', 'Set the Novu Endpoint mounted route, defaults to /api/novu', '/api/novu')
  .option('-o, --origin <value>', 'Set the origin for the Novu endpoint')
  .option('-sp, --studio-port <value>', 'Set the local port for the Novu Local Studio server, defaults to 2022', '2022')
  .option(
    '-so, --studio-remote-origin <value>',
    'Set the remote origin for Novu Studio, used for staging environment and local development, defaults to https://web.novu.co',
    'https://web.novu.co'
  )
  .option(
    '--region <value>',
    'Studio Origin SPA, used for staging environment and local development, defaults to us',
    'us'
  )
  .action((options: DevCommandOptions) => devCommand(options));

program.parse(process.argv);

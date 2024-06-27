#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand, devCommand, DevCommandOptions } from './commands';

const program = new Command();

program.name('novu').description('A CLI tool to interact with the novu API');

program
  .command('init')
  .description('Initialize a new project and create an account')
  .action(() => {
    initCommand();
  });

program
  .command('dev')
  .description('Start a Novu Dev Studio and a localtunnel')
  .option('-p, --port <value>', 'Set the local port for the Novu endpoint, defaults to 4000', '4000')
  .option('-er, --endpoint-route <value>', 'Set the Novu Endpoint mounted route, defaults to /api/novu', '/api/novu')
  .option('-o, --origin <value>', 'Set the origin for the Novu endpoint')
  .option('-sp, --studio-port <value>', 'Set the local port for the Novu Local Studio server, defaults to 2022', '2022')
  .option(
    '-so, --studio-remote-origin <value>',
    'Set the remote origin for Novu Studio, used for staging environment and local development, defaults to https://web.novu.co',
    'https://web.novu.co'
  )
  .option(
    '-r, --region <value>',
    'Studio Origin SPA, used for staging environment and local development, defaults to us',
    'us'
  )
  .action((options: DevCommandOptions) => devCommand(options))
  .parse(process.argv);

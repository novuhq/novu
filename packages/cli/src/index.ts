#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand, tunnelCommand } from './commands';

const program = new Command();

program.name('novu').description('A CLI tool to interact with the novu API');

program
  .command('init')
  .description('Initialize a new project and create an account')
  .action(() => {
    initCommand();
  });

program
  .command('tunnel')
  .description('Start localtunnel and a well known discovery server to help with local development')
  .option('-p, --novu-port', 'localhost port where the novu endpoint is avilable, default is 4000', '4000')
  .option(
    '-h, --tunnel-host',
    'host domain providing the tunnel, default is "https://localtunnel.me"',
    'https://localtunnel.me'
  )
  .option('-s, --subdomain', 'Request a specific subdomain, default is a random value', '')
  .action((options) => {
    tunnelCommand(options.novuPort, options.tunnelHost, options.subdomain);
  });

program.parse();

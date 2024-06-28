#!/usr/bin/env node

import { Command, Option } from 'commander';
import { initCommand, devCommand, DevCommandOptions } from './commands';

const program = new Command();

program.name('novu').description('A CLI tool to interact with the Novu Platform');

program
  .command('init')
  .description('Initialize a new project and create an account')
  .action(() => {
    initCommand();
  });

program
  .command('dev')
  .description(
    `Start Novu Studio and a localtunnel

  Running the Bridge application on port 4000: 
  (e.g., novu dev -p 4000)

  Running the Bridge application on a different route: 
  (e.g., novu dev -r /v1/api/novu)

  Using Europe region:
  (e.g., novu dev -cr eu)`
  )
  .usage('[-p <port>] [-r <route>] [-o <origin>] [-cr <region>] [-cd <dashboard-url>] [-sp <studio-port>]')
  .option('-p, --port <value>', 'The local Bridge endpoint port', '4000')
  .option('-r, --route <value>', 'The Bridge endpoint route', '/api/novu')
  .option('-o, --origin <value>', 'The Bridge endpoint origin')
  .addOption(new Option('-cr, --region <value>', 'The Cloud Dashboard region').default('us').choices(['us', 'eu']))
  .option('-cd, --dashboard-url <value>', 'The Cloud Dashboard URL', 'https://dashboard.novu.co')
  .option('-sp, --studio-port <value>', 'The Local Studio server port', '2022')
  .action((options: DevCommandOptions) => devCommand(options))
  .parse(process.argv);

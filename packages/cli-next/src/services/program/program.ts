#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { randomUUID } from 'crypto';

import { echo } from '../../commands/echo';
import { sync } from '../../commands/sync';
import { AnalyticService } from '../analytics.service';
import { ConfigService } from '../config.service';

const analytics = new AnalyticService();
const config = new ConfigService();
if (process.env.NODE_ENV === 'development') {
  config.clearStore();
}

const anonymousIdLocalState = config.getValue('anonymousId');
const anonymousId = anonymousIdLocalState || randomUUID();

if (!anonymousIdLocalState) {
  config.setValue('anonymousId', anonymousId);
}

export const buildProgram = () => {
  const program = new Command().allowUnknownOption(true).allowExcessArguments(true);

  program.name('novu-labs').description('CLI to some JavaScript string utilities').version('0.0.1');

  program
    .command('echo')
    .option('-p, --port <port>', 'A port to run Dev Studio on', '2022')
    .description('Start an echo server')
    .action(async (options) => {
      analytics.track({
        identity: {
          anonymousId: anonymousId,
        },
        data: {},
        event: 'Start Echo Server',
      });

      await echo(anonymousId, options.port);
    });

  program
    .command('sync')
    .option('-b, --backend-url <backendUrl>', 'The backend url to use', 'https://api.novu.co')
    .requiredOption('--echo-url <echoUrl>', 'The cho url to use')
    .requiredOption('--api-key <apiKey>', 'The Novu api key to use')
    .description('Sync your Novu Framework state with Novu Cloud')
    .action(async (options) => {
      printSyncDeprecationWarning();
      analytics.track({
        identity: {
          anonymousId: anonymousId,
        },
        data: {},
        event: 'Sync Echo State',
      });

      await sync(options.echoUrl, options.apiKey, options.backendUrl);
    });

  return program;
};

function printSyncDeprecationWarning() {
  console.log('');
  console.log(
    chalk.yellowBright(chalk.bold('############################# DEPRECATION WARNING ##############################'))
  );
  console.log(
    chalk.yellowBright(chalk.bold('#          The `novu-labs` package is deprecated, please install `novu`        #'))
  );
  console.log(
    chalk.yellowBright(chalk.bold('#                       and use use `novu sync` instead                        #'))
  );

  console.log(
    chalk.yellowBright(chalk.bold('################################################################################'))
  );
  console.log('');
}

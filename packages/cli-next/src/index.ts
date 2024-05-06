#!/usr/bin/env node
import { Command } from 'commander';
import { syncState } from './sync-state';
import { startStudio } from './start-studio';
import { AnalyticService, ConfigService } from './services';
import { v4 as uuidv4 } from 'uuid';

const program = new Command().allowUnknownOption(true).allowExcessArguments(true);

const analytics = new AnalyticService();
const config = new ConfigService();
if (process.env.NODE_ENV === 'development') {
  config.clearStore();
}

const anonymousIdLocalState = config.getValue('anonymousId');
const anonymousId = anonymousIdLocalState || uuidv4();

if (!anonymousIdLocalState) {
  config.setValue('anonymousId', anonymousId);
}

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

    await startStudio(anonymousId, options.port);
  });

program
  .command('sync')
  .option('-b, --backend-url <backendUrl>', 'The backend url to use', 'https://api.novu.co')
  .requiredOption('--echo-url <echoUrl>', 'The cho url to use')
  .requiredOption('--api-key <apiKey>', 'The Novu api key to use')
  .description('Sync your Echo state with Novu Cloud')
  .action(async (options) => {
    analytics.track({
      identity: {
        anonymousId: anonymousId,
      },
      data: {},
      event: 'Sync Echo State',
    });

    await syncState(options.echoUrl, options.apiKey, options.backendUrl);
  });

program.parse(process.argv);

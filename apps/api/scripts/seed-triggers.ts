import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', 'src', '.env') });

import '../src/config';
import { NestFactory } from '@nestjs/core';
import { AddressingTypeEnum, TriggerRequestCategoryEnum } from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';
import { ParseEventRequestMulticastCommand } from '../src/app/events/usecases/parse-event-request/parse-event-request.command';
import { ParseEventRequest } from '../src/app/events/usecases/parse-event-request/parse-event-request.usecase';
import { AppModule } from '../src/app.module';

interface SeedConfig {
  workflow: string;
  subscriber: string;
  count: number;
  organizationId: string;
  environmentId: string;
  userId: string;
  delay: number;
  payload: Record<string, any>;
  concurrent: number;
}

function parseCliArgs(): SeedConfig {
  const args = process.argv.slice(2);
  const config: Partial<SeedConfig> = {
    delay: 0,
    payload: {},
    concurrent: 1,
    count: 1,
  };

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    let value = args[i + 1];

    if (arg.includes('=')) {
      const [key, val] = arg.split('=');
      arg = key;
      value = val;
    }

    switch (arg) {
      case '--workflow':
      case '-w':
        config.workflow = value;
        if (!args[i].includes('=')) i++;
        break;
      case '--subscriber':
      case '-s':
        config.subscriber = value;
        if (!args[i].includes('=')) i++;
        break;
      case '--count':
      case '-c':
        config.count = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--org-id':
        config.organizationId = value;
        if (!args[i].includes('=')) i++;
        break;
      case '--env-id':
        config.environmentId = value;
        if (!args[i].includes('=')) i++;
        break;
      case '--user-id':
        config.userId = value;
        if (!args[i].includes('=')) i++;
        break;
      case '--delay':
      case '-d':
        config.delay = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--payload':
      case '-p':
        try {
          config.payload = JSON.parse(value);
        } catch (error) {
          console.error('Error: Invalid JSON payload');
          process.exit(1);
        }
        if (!args[i].includes('=')) i++;
        break;
      case '--concurrent':
        config.concurrent = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  const required: Array<keyof SeedConfig> = ['workflow', 'subscriber', 'organizationId', 'environmentId', 'userId'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    console.error(`Error: Missing required arguments: ${missing.join(', ')}`);
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (!config.workflow || !config.subscriber || !config.organizationId || !config.environmentId || !config.userId) {
    console.error('Error: Missing required arguments');
    process.exit(1);
  }

  return {
    workflow: config.workflow,
    subscriber: config.subscriber,
    count: config.count ?? 1,
    organizationId: config.organizationId,
    environmentId: config.environmentId,
    userId: config.userId,
    delay: config.delay ?? 0,
    payload: config.payload ?? {},
    concurrent: config.concurrent ?? 1,
  };
}

function printHelp() {
  console.log(`
Natural Trigger Seed Script

Usage: pnpm seed:triggers [options]

Required Arguments:
  -w, --workflow <name>       Workflow identifier (trigger name)
  -s, --subscriber <id>       Subscriber ID to send to
  --org-id <id>               Organization ID
  --env-id <id>               Environment ID
  --user-id <id>              User ID

Optional Arguments:
  -c, --count <num>           Number of triggers to execute (default: 1)
  -d, --delay <ms>            Delay between triggers in milliseconds (default: 0)
  -p, --payload <json>        JSON payload to include (default: {})
  --concurrent <num>          Number of concurrent triggers (default: 1)
  -h, --help                  Show this help message

Examples:
  # Basic usage - trigger 100 times
  pnpm seed:triggers \\
    --workflow=my-workflow \\
    --subscriber=subscriber-123 \\
    --count=100 \\
    --org-id=org-abc \\
    --env-id=env-xyz \\
    --user-id=user-456

  # With custom payload and delay
  pnpm seed:triggers \\
    --workflow=order-confirmation \\
    --subscriber=user@example.com \\
    --count=50 \\
    --org-id=org-abc \\
    --env-id=env-xyz \\
    --user-id=user-456 \\
    --delay=100 \\
    --payload='{"orderId":"12345","amount":99.99}'

  # Concurrent triggers
  pnpm seed:triggers \\
    --workflow=newsletter \\
    --subscriber=subscriber-123 \\
    --count=1000 \\
    --org-id=org-abc \\
    --env-id=env-xyz \\
    --user-id=user-456 \\
    --concurrent=10
  `);
}

function formatProgress(current: number, total: number): string {
  const barLength = 30;
  const percentage = (current / total) * 100;
  const filledLength = Math.round((percentage / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  return `  [${bar}] ${percentage.toFixed(1)}% (${current.toLocaleString()}/${total.toLocaleString()})`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function triggerBatch(
  parseEventRequest: ParseEventRequest,
  config: SeedConfig,
  batchSize: number,
  successCount: { value: number },
  errorCount: { value: number }
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (let i = 0; i < batchSize; i++) {
    const promise = (async () => {
      try {
        await parseEventRequest.execute(
          ParseEventRequestMulticastCommand.create({
            userId: config.userId,
            environmentId: config.environmentId,
            organizationId: config.organizationId,
            identifier: config.workflow,
            payload: config.payload || {},
            overrides: {},
            to: [config.subscriber],
            addressingType: AddressingTypeEnum.MULTICAST,
            requestCategory: TriggerRequestCategoryEnum.SINGLE,
            requestId: uuidv4(),
          })
        );
        successCount.value++;
      } catch (error) {
        errorCount.value++;
        console.error(`\nError triggering event: ${error.message}`);
      }
    })();

    promises.push(promise);
  }

  await Promise.all(promises);
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Natural Trigger Seed Script');
  console.log('='.repeat(60) + '\n');

  const config = parseCliArgs();

  console.log('Configuration:');
  console.log('-'.repeat(60));
  console.log(`  Workflow:       ${config.workflow}`);
  console.log(`  Subscriber:     ${config.subscriber}`);
  console.log(`  Count:          ${config.count.toLocaleString()}`);
  console.log(`  Organization:   ${config.organizationId}`);
  console.log(`  Environment:    ${config.environmentId}`);
  console.log(`  User:           ${config.userId}`);
  console.log(`  Delay:          ${config.delay}ms`);
  console.log(`  Concurrent:     ${config.concurrent}`);
  console.log(`  Payload:        ${JSON.stringify(config.payload)}`);
  console.log('');

  console.log('Bootstrapping NestJS application...');
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  console.log('✓ Application bootstrapped\n');

  const parseEventRequest = app.get(ParseEventRequest);
  console.log('✓ ParseEventRequest service retrieved\n');

  console.log('Starting trigger execution:');
  console.log('-'.repeat(60));

  const startTime = Date.now();
  const successCount = { value: 0 };
  const errorCount = { value: 0 };
  let processed = 0;

  const totalBatches = Math.ceil(config.count / config.concurrent);

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(config.concurrent, config.count - processed);

    await triggerBatch(parseEventRequest, config, batchSize, successCount, errorCount);

    processed += batchSize;
    process.stdout.write('\r' + formatProgress(processed, config.count));

    if (config.delay > 0 && processed < config.count) {
      await sleep(config.delay);
    }
  }

  console.log('\n');

  const totalDuration = Date.now() - startTime;
  const durationSeconds = totalDuration / 1000;

  console.log('✓ Trigger execution complete');
  console.log('-'.repeat(60));
  console.log(`  Total triggers:   ${config.count.toLocaleString()}`);
  console.log(`  Successful:       ${successCount.value.toLocaleString()}`);
  console.log(`  Failed:           ${errorCount.value.toLocaleString()}`);
  console.log(`  Duration:         ${durationSeconds.toFixed(2)}s`);
  console.log(`  Rate:             ${(config.count / durationSeconds).toFixed(2)} triggers/second`);
  console.log('');

  console.log('✓ Seeding completed successfully!\n');

  await app.close();
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { main };

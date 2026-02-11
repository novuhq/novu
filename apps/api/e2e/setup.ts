import { ClickHouseClient, ClickHouseService, createClickHouseClient } from '@novu/application-generic';
import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import axios from 'axios';
import chai from 'chai';
import { Connection } from 'mongoose';
import sinon from 'sinon';
import { ZodError } from 'zod';
import { bootstrap } from '../src/bootstrap';

let databaseConnection: Connection;
let analyticsConnection: ClickHouseClient | undefined;
let clickHouseService: ClickHouseService | undefined;
const dalService = new DalService();

async function getDatabaseConnection(): Promise<Connection> {
  if (!databaseConnection) {
    databaseConnection = await dalService.connect(process.env.MONGO_URL);
  }

  return databaseConnection;
}

async function dropDatabase(): Promise<void> {
  try {
    const conn = await getDatabaseConnection();
    await conn.dropDatabase();
  } catch (error) {
    console.error('Error dropping the database:', error);
  }
}

async function ensureIndexes(conn: Connection): Promise<void> {
  const models = Object.values(conn.models);

  await Promise.all(
    models.map(async (model) => {
      try {
        await model.ensureIndexes();
      } catch (_error) {
        // Ignore errors - indexes will be created if they don't exist
        // Conflicts are expected when index already exists
      }
    })
  );

  console.log('Indexes ensured for all models');
}

async function closeDatabaseConnection(): Promise<void> {
  if (databaseConnection) {
    await databaseConnection.close();
  }
}

async function getClickHouseConnection(): Promise<ClickHouseClient | undefined> {
  if (!analyticsConnection) {
    if (!clickHouseService) {
      clickHouseService = new ClickHouseService();
      await clickHouseService.init();
    }
    analyticsConnection = clickHouseService?.client;
  }

  return analyticsConnection;
}

function createClickHouseTestClient(database?: string): ClickHouseClient {
  return createClickHouseClient({
    host: 'http://localhost:8123',
    username: 'default',
    password: '',
    database: database || 'default',
  });
}

async function ensureClickHouseDatabase(databaseName: string): Promise<void> {
  try {
    const client = createClickHouseTestClient('default');
    await client.query({
      query: `CREATE DATABASE IF NOT EXISTS ${databaseName}`,
    });
    console.log(`Database "${databaseName}" ensured.`);
  } catch (error) {
    console.log(`Failed to create database ${databaseName}:`, error.message);
  }
}

async function getClickHouseTables(databaseName: string): Promise<string[]> {
  try {
    const conn = await getClickHouseConnection();
    if (!conn) return [];

    const result = await conn.query({
      query: `SHOW TABLES FROM ${databaseName}`,
      format: 'JSONEachRow',
    });

    const tables = (await result.json()) as Array<{ name: string }>;

    return tables.map((t) => t.name);
  } catch (error) {
    console.log(`Could not query tables in ${databaseName}: ${error.message}`);

    return [];
  }
}

async function truncateClickHouseTable(databaseName: string, tableName: string): Promise<void> {
  try {
    const conn = await getClickHouseConnection();
    if (!conn) return;

    await conn.exec({ query: `TRUNCATE TABLE IF EXISTS ${databaseName}.${tableName}` });
    console.log(`Successfully cleaned table ${tableName}`);
  } catch (error) {
    console.log(`Failed to clean table ${tableName}:`, error.message);
  }
}

async function cleanupClickHouseDatabase(): Promise<void> {
  try {
    const databaseName = process.env.CLICK_HOUSE_DATABASE || 'test_logs';
    console.log(`Cleaning up ClickHouse database: ${databaseName}`);

    await ensureClickHouseDatabase(databaseName);

    const tables = await getClickHouseTables(databaseName);
    if (tables.length > 0) {
      console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);
      await Promise.all(tables.map((table) => truncateClickHouseTable(databaseName, table)));
      console.log(`Cleaned up ${tables.length} tables in ${databaseName}`);
    } else {
      console.log(`No tables to clean up in ${databaseName}`);
    }

    console.log(`ClickHouse database ${databaseName} cleanup completed`);
  } catch (error) {
    console.log('Analytics database cleanup encountered an issue:', error.message);
    console.log('This is acceptable for test environment - continuing with test setup');
  }
}

async function closeClickHouseConnection(): Promise<void> {
  if (analyticsConnection) {
    await analyticsConnection.close();
  }
  if (clickHouseService) {
    await clickHouseService.beforeApplicationShutdown();
  }
}

async function waitForHealthCheck(): Promise<void> {
  const port = process.env.PORT;
  const healthCheckUrl = `http://localhost:${port}/v1/health-check`;
  const maxRetries = 60;
  const retryDelay = 1000;

  console.log(`Waiting for health check at ${healthCheckUrl}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(healthCheckUrl, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });

      if (response.status === 200) {
        console.log(`Health check passed on attempt ${attempt}`);

        return;
      }
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        console.error(`Health check failed after ${maxRetries} attempts. Last error:`, error.message);
        throw new Error(`Health check failed after ${maxRetries} attempts`);
      }

      console.log(`Health check attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

function formatZodError(err: ZodError, level = 0): string {
  let pre = '  '.repeat(level);
  pre = level > 0 ? `│${pre}` : pre;
  pre += ' '.repeat(level);

  let message = '';
  const append = (str: string) => {
    message += `\n${pre}${str}`;
  };

  const len = err.issues.length;
  const headline = len === 1 ? `${len} issue found` : `${len} issues found`;

  if (len) {
    append(`┌ ${headline}:`);
  }

  for (const issue of err.issues) {
    let path = issue.path.join('.');
    path = path ? `<root>.${path}` : '<root>';
    append(`│ • [${path}]: ${issue.message} (${issue.code})`);
    switch (issue.code) {
      case 'invalid_literal':
      case 'invalid_type': {
        append(`│     Want: ${issue.expected}`);
        append(`│      Got: ${issue.received}`);
        break;
      }
      case 'unrecognized_keys': {
        append(`│     Keys: ${issue.keys.join(', ')}`);
        break;
      }
      case 'invalid_enum_value': {
        append(`│     Allowed: ${issue.options.join(', ')}`);
        append(`│         Got: ${issue.received}`);
        break;
      }
      case 'invalid_union_discriminator': {
        append(`│     Allowed: ${issue.options.join(', ')}`);
        break;
      }
      case 'invalid_union': {
        const unionLen = issue.unionErrors.length;
        append(`│   ✖︎ Attemped to deserialize into one of ${unionLen} union members:`);
        issue.unionErrors.forEach((unionErr, i) => {
          append(`│   ✖︎ Member ${i + 1} of ${unionLen}`);
          append(`${formatZodError(unionErr, level + 1)}`);
        });
      }
    }
  }

  if (err.issues.length) {
    append(`└─*`);
  }

  return message.slice(1);
}

function isResponseValidationError(error: unknown): error is {
  name: string;
  statusCode: number;
  body: string;
  rawResponse?: { url?: string };
  pretty: () => string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ResponseValidationError' &&
    'statusCode' in error &&
    'pretty' in error &&
    typeof (error as { pretty: unknown }).pretty === 'function'
  );
}

function isValidationErrorDto(error: unknown): error is Error & {
  name: string;
  statusCode: number;
  path: string;
  timestamp: string;
  errors: Record<string, { messages: string[] }>;
  body?: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ValidationErrorDto' &&
    'statusCode' in error &&
    'errors' in error &&
    'path' in error &&
    typeof (error as { errors: unknown }).errors === 'object'
  );
}

/*
 * poc for logging errors in e2e tests where the context is not available
 * if it's adding unnecessary noise, we can remove it
 */
function logE2EFailure(error: unknown): void {
  if (isResponseValidationError(error)) {
    const url = error.rawResponse?.url ?? 'unknown URL';
    console.error('\n[Response validation error]');
    console.error(`Status: ${error.statusCode} ${url}`);
    console.error(error.pretty());
    if (error.body) {
      // uncomment for more detailed error messages
      // console.error(`Response body: ${error.body}`);
    }

    return;
  }

  if (isValidationErrorDto(error)) {
    console.error('\n[Validation error]');
    console.error(`Status: ${error.statusCode} ${error.path}`);
    console.error(`Timestamp: ${error.timestamp}`);
    console.error('Validation errors:');
    for (const [field, fieldError] of Object.entries(error.errors)) {
      console.error(`  ${field}:`);
      for (const message of fieldError.messages) {
        console.error(`    - ${message}`);
      }
    }
    if (error.body) {
      console.error(`\nFull response body: ${error.body}`);
    }

    return;
  }

  const typedError = error as Error & { cause?: unknown };
  if (typedError.cause instanceof ZodError) {
    console.error('\n[Zod validation error]');
    console.error(formatZodError(typedError.cause));

    return;
  }

  if (error instanceof ZodError) {
    console.error('\n[Zod validation error]');
    console.error(formatZodError(error));

    return;
  }
}

before(async () => {
  /**
   * disable truncating for better error messages - https://www.chaijs.com/guide/styles/#configtruncatethreshold
   */
  chai.config.truncateThreshold = 0;

  await dropDatabase();
  await cleanupClickHouseDatabase();
  const bootstrapped = await bootstrap();

  // Ensure indexes after bootstrap when all models are registered
  const conn = await getDatabaseConnection();
  await ensureIndexes(conn);

  await testServer.create(bootstrapped.app);

  await waitForHealthCheck();
});

after(async () => {
  await testServer.teardown();
  await dropDatabase();
  await cleanupClickHouseDatabase();
  await closeDatabaseConnection();
  await closeClickHouseConnection();
});

afterEach(async function () {
  if (this.currentTest?.state === 'failed' && this.currentTest.err) {
    logE2EFailure(this.currentTest.err);
  }

  sinon.restore();
});

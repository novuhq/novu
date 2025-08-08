import { ClickHouseClient, ClickHouseService, createClickHouseClient } from '@novu/application-generic';
import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import axios from 'axios';
import chai from 'chai';
import { Connection } from 'mongoose';
import sinon from 'sinon';
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
    await conn.db.dropDatabase();
  } catch (error) {
    console.error('Error dropping the database:', error);
  }
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
    await clickHouseService.onModuleDestroy();
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

before(async () => {
  /**
   * disable truncating for better error messages - https://www.chaijs.com/guide/styles/#configtruncatethreshold
   */
  chai.config.truncateThreshold = 0;

  await dropDatabase();
  await cleanupClickHouseDatabase();
  const bootstrapped = await bootstrap();
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

afterEach(async () => {
  sinon.restore();
});

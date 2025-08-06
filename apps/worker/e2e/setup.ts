import { ClickHouseClient, ClickHouseService, createClickHouseClient, PinoLogger } from '@novu/application-generic';
import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import sinon from 'sinon';
import { bootstrap } from '../src/bootstrap';

const dalService = new DalService();
let analyticsConnection: ClickHouseClient | undefined;
let clickHouseService: ClickHouseService | undefined;

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

before(async () => {
  await testServer.create(await bootstrap());
  await dalService.connect(process.env.MONGO_URL);
  await cleanupClickHouseDatabase();
});

after(async () => {
  try {
    await testServer.teardown();
    await dalService.destroy();
    await cleanupClickHouseDatabase();
  } catch (e) {
    if (e.code !== 12586) {
      throw e;
    }
  }
});

afterEach(() => {
  sinon.restore();
});

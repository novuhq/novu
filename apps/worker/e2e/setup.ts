import { ClickHouseClient, createClickHouseClient } from '@novu/application-generic';
import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import sinon from 'sinon';
import { bootstrap } from '../src/bootstrap';

const dalService = new DalService();

function createClickHouseTestClient(database?: string): ClickHouseClient {
  return createClickHouseClient({
    host: process.env.CLICK_HOUSE_URL || 'http://localhost:8123',
    username: process.env.CLICK_HOUSE_USER || 'default',
    password: process.env.CLICK_HOUSE_PASSWORD || '',
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

/**
 * Drops the test database instead of emptying its tables. The worker creates its tables at boot with `CREATE TABLE IF
 * NOT EXISTS`, so tables kept from an older run would never get the columns added since, unlike CI's fresh ClickHouse.
 */
async function cleanupClickHouseDatabase(): Promise<void> {
  const databaseName = process.env.CLICK_HOUSE_DATABASE || 'test_logs';
  // Without NODE_ENV=test the worker loads apps/worker/src/.env, which points at the developer's own database.
  if (process.env.NODE_ENV !== 'test' || !databaseName.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to drop the ClickHouse database "${databaseName}" with NODE_ENV=${process.env.NODE_ENV ?? '(unset)'}. ` +
        'The worker test setup only drops test databases; run the tests with NODE_ENV=test (e.g. pnpm test:e2e).'
    );
  }

  const client = createClickHouseTestClient('default');
  try {
    console.log(`Recreating ClickHouse database: ${databaseName}`);

    await client.command({ query: `DROP DATABASE IF EXISTS ${databaseName}` });
    await ensureClickHouseDatabase(databaseName);
  } catch (error) {
    console.log('Analytics database cleanup encountered an issue:', error.message);
    console.log('This is acceptable for test environment - continuing with test setup');
  } finally {
    await client.close();
  }
}

before(async () => {
  // Before the boot, which creates the tables.
  await cleanupClickHouseDatabase();
  await testServer.create(await bootstrap());
  await dalService.connect(process.env.MONGO_URL);
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

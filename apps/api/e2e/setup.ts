import { testServer } from '@novu/testing';
import sinon from 'sinon';
import chai from 'chai';
import { Connection } from 'mongoose';
import { DalService } from '@novu/dal';
import { ClickHouseClient, ClickHouseService, PinoLogger } from '@novu/application-generic';
import { bootstrap } from '../src/bootstrap';

let databaseConnection: Connection;
let analyticsConnection: ClickHouseClient | undefined;
const dalService = new DalService();

async function getDatabaseConnection() {
  if (!databaseConnection) {
    databaseConnection = await dalService.connect(process.env.MONGO_URL);
  }

  return databaseConnection;
}

async function getAnalyticsConnection() {
  if (!analyticsConnection) {
    const clickHouseService = new ClickHouseService(new PinoLogger({}));
    await clickHouseService.init();
    analyticsConnection = clickHouseService?.client;
  }

  return analyticsConnection;
}

async function dropDatabase() {
  try {
    const conn = await getDatabaseConnection();
    await conn.db.dropDatabase();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error dropping the database:', error);
  }
}

async function cleanupClickHouseDatabase() {
  try {
    const conn = await getAnalyticsConnection();
    if (!conn) {
      // eslint-disable-next-line no-console
      console.log('ClickHouse client not initialized, skipping analytics database cleanup');

      return;
    }

    const databaseName = process.env.CLICK_HOUSE_DATABASE || 'test_logs';

    // eslint-disable-next-line no-console
    console.log(`Cleaning up ClickHouse database: ${databaseName}`);

    // First ensure the database exists
    try {
      await conn.exec({ query: `CREATE DATABASE IF NOT EXISTS ${databaseName}` });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to ensure database ${databaseName} exists:`, error.message);

      return;
    }

    // Get list of all tables in the database
    let tables: Array<{ name: string }> = [];
    try {
      const tablesResult = await conn.query({
        query: `SHOW TABLES FROM ${databaseName}`,
        format: 'JSONEachRow',
      });

      tables = (await tablesResult.json()) as Array<{ name: string }>;
      // eslint-disable-next-line no-console
      console.log(`Found ${tables.length} tables in ${databaseName}:`, tables.map((t) => t.name).join(', '));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`No tables found in ${databaseName} or error querying tables:`, error.message);
    }

    // Clean up each table
    if (tables.length > 0) {
      for (const table of tables) {
        await cleanupTable(conn, databaseName, table.name);
      }
      // eslint-disable-next-line no-console
      console.log(`Cleaned up ${tables.length} tables in ${databaseName}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`No tables to clean up in ${databaseName}`);
    }

    // eslint-disable-next-line no-console
    console.log(`ClickHouse database ${databaseName} is ready for tests`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during analytics database cleanup:', error.message);
  }
}

async function cleanupTable(conn: ClickHouseClient, databaseName: string, tableName: string) {
  try {
    await conn.exec({ query: `TRUNCATE TABLE IF EXISTS ${databaseName}.${tableName}` });
    // eslint-disable-next-line no-console
    console.log(`Successfully cleaned table ${tableName} using TRUNCATE`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Failed to clean table ${tableName} with TRUNCATE:`, error.message);
  }
}

before(async () => {
  /**
   * disable truncating for better error messages - https://www.chaijs.com/guide/styles/#configtruncatethreshold
   */
  chai.config.truncateThreshold = 0;

  await dropDatabase();
  await cleanupClickHouseDatabase();
  await testServer.create((await bootstrap()).app);
});

after(async () => {
  await testServer.teardown();
  await dropDatabase();
  await cleanupClickHouseDatabase();

  if (databaseConnection) {
    await databaseConnection.close();
  }
  if (analyticsConnection) {
    await analyticsConnection.close();
  }
});

afterEach(async function () {
  sinon.restore();
});

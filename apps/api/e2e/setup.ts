import { testServer } from '@novu/testing';
import sinon from 'sinon';
import chai from 'chai';
import mongoose from 'mongoose';
import { bootstrap } from '../src/bootstrap';

let connection: typeof mongoose;

async function getConnection() {
  if (!connection) {
    connection = await mongoose.connect(process.env.MONGO_URL);
  }

  return connection;
}

async function dropDatabase() {
  try {
    const conn = await getConnection();
    await conn.connection.db.dropDatabase();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error dropping the database:', error);
  }
}

before(async () => {
  /**
   * disable truncating for better error messages - https://www.chaijs.com/guide/styles/#configtruncatethreshold
   */
  chai.config.truncateThreshold = 0;
  await dropDatabase();
  await testServer.create((await bootstrap()).app);
});

after(async () => {
  await testServer.teardown();
});

afterEach(async function () {
  sinon.restore();
});

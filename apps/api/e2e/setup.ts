import { testServer } from '@novu/testing';
import sinon from 'sinon';
import chai from 'chai';
import { default as mongoose } from 'mongoose';
import { bootstrap } from '../src/bootstrap';

async function dropDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    await mongoose.connection.db.dropDatabase();
  } catch (error) {
    console.error('Error dropping the database:', error);
  } finally {
    await mongoose.disconnect();
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
  await dropDatabase();
});

// TODO: Remove this
afterEach(() => {
  sinon.restore();
});

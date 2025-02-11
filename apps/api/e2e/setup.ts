import { testServer, TestingQueueService } from '@novu/testing';
import sinon from 'sinon';
import chai from 'chai';
import mongoose from 'mongoose';
import { JobRepository } from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';
import { bootstrap } from '../src/bootstrap';

const jobRepository = new JobRepository();

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
  await dropDatabase();
  if (connection) {
    await connection.disconnect();
  }
});

afterEach(async () => {
  const workflowQueue = new TestingQueueService(JobTopicNameEnum.WORKFLOW).queue;
  const standardQueue = new TestingQueueService(JobTopicNameEnum.STANDARD).queue;
  const subscriberProcessQueue = new TestingQueueService(JobTopicNameEnum.PROCESS_SUBSCRIBER).queue;

  const countBeforeDrain = await Promise.all([
    workflowQueue.count(),
    standardQueue.count(),
    subscriberProcessQueue.count(),
  ]);

  await Promise.all([
    jobRepository._model.deleteMany({}),
    workflowQueue.drain(),
    standardQueue.drain(),
    subscriberProcessQueue.drain(),
  ]);

  const countAfterDrain = await Promise.all([
    workflowQueue.count(),
    standardQueue.count(),
    subscriberProcessQueue.count(),
  ]);

  // eslint-disable-next-line no-console
  console.log('stats before drain ', countBeforeDrain, ' stats after drain ', countAfterDrain);

  sinon.restore();
});

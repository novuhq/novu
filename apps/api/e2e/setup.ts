import { JobsService, TestingQueueService, testServer } from '@novu/testing';
import sinon from 'sinon';
import chai from 'chai';
import mongoose from 'mongoose';
import { JobRepository } from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';
import { bootstrap } from '../src/bootstrap';

const jobRepository = new JobRepository();
const workflowQueue = new TestingQueueService(JobTopicNameEnum.WORKFLOW).queue;
const standardQueue = new TestingQueueService(JobTopicNameEnum.STANDARD).queue;
const subscriberProcessQueue = new TestingQueueService(JobTopicNameEnum.PROCESS_SUBSCRIBER).queue;

let connection: typeof mongoose;
const jobsService = new JobsService();

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
  await dropDatabase();
  if (connection) {
    await connection.disconnect();
  }
});

async function cleanup() {
  await Promise.all([
    workflowQueue.obliterate({ force: true }),
    standardQueue.obliterate({ force: true }),
    subscriberProcessQueue.obliterate({ force: true }),
  ]);

  await jobRepository._model.deleteMany({});

  const jobCount = await jobRepository.count({} as any);
  const metric = await jobsService.getQueueMetric();

  if (metric.totalCount !== 0) {
    // eslint-disable-next-line no-console
    console.log('after cleanup metric.totalCount !== 0 metric', metric);
    // eslint-disable-next-line no-console
    console.log('after cleanup metric.totalCount !== 0 jobCount', jobCount);
  }

  if (jobCount !== 0) {
    // eslint-disable-next-line no-console
    console.log('after cleanup jobCount !== 0 metric', metric);
    // eslint-disable-next-line no-console
    console.log('after cleanup jobCount !== 0 jobCount', jobCount);
  }
}

async function createCleanupTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

afterEach(async function () {
  const TIMEOUT = 4500;
  sinon.restore();

  try {
    await Promise.race([cleanup(), createCleanupTimeout(TIMEOUT).then(() => {})]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during cleanup:', error);
  }
});

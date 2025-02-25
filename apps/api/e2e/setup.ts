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

async function cleanup() {
  const jobsService = new JobsService();
  await jobsService.runAllDelayedJobsImmediately();
  await jobsService.awaitAllJobs();

  await Promise.all([workflowQueue.drain(), standardQueue.drain(), subscriberProcessQueue.drain()]);

  await jobRepository._model.deleteMany({});
}

function timeoutPromise(ms: number) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

afterEach(async function () {
  const TIMEOUT = 4500;
  sinon.restore();

  try {
    await Promise.race([cleanup(), timeoutPromise(TIMEOUT).then(() => {})]);
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

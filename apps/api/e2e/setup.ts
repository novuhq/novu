import { testServer } from '@novu/testing';
import sinon from 'sinon';
import chai from 'chai';
import { Connection } from 'mongoose';
import { DalService } from '@novu/dal';
import { bootstrap } from '../src/bootstrap';
import AWS from 'aws-sdk';

let connection: Connection;
const dalService = new DalService();

setupS3Mock();

function setupS3Mock() {
  try {
    const s3 = new AWS.S3({
      endpoint: process.env.S3_LOCAL_STACK,
      accessKeyId: 'test',
      secretAccessKey: 'test',
      s3ForcePathStyle: true,
    });
    
    s3.config.credentials = { accessKeyId: 'test', secretAccessKey: 'test' };
    
  } catch (error) {
    console.log('LocalStack S3 not available at startup, using mock implementation');
    mockS3Service();
  }
}

function mockS3Service() {
  const mockS3 = {
    putObject: sinon.stub().returns({
      promise: sinon.stub().resolves({}),
    }),
    getObject: sinon.stub().returns({
      promise: sinon.stub().resolves({
        Body: Buffer.from('mock-data'),
      }),
    }),
    listObjects: sinon.stub().returns({
      promise: sinon.stub().resolves({
        Contents: [],
      }),
    }),
    listBuckets: sinon.stub().returns({
      promise: sinon.stub().resolves({
        Buckets: [],
      }),
    }),
    createBucket: sinon.stub().returns({
      promise: sinon.stub().resolves({}),
    }),
  };
  
  const originalS3 = AWS.S3;
  AWS.S3 = function() {
    return mockS3;
  } as any;
  
  AWS.S3.prototype = originalS3.prototype;
}

async function getConnection() {
  if (!connection) {
    connection = await dalService.connect(process.env.MONGO_URL);
  }

  return connection;
}

async function dropDatabase() {
  try {
    const conn = await getConnection();
    await conn.db.dropDatabase();
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
  
  try {
    const s3 = new AWS.S3({
      endpoint: process.env.S3_LOCAL_STACK,
      accessKeyId: 'test',
      secretAccessKey: 'test',
      s3ForcePathStyle: true,
    });
    
    await s3.listBuckets().promise();
    console.log('LocalStack S3 is available');
  } catch (error) {
    console.log('LocalStack S3 not available in before hook, using mock implementation');
    mockS3Service();
  }
  
  await dropDatabase();
  await testServer.create((await bootstrap()).app);
});

after(async () => {
  await testServer.teardown();
  await dropDatabase();
  if (connection) {
    await connection.close();
  }
});

afterEach(async function () {
  sinon.restore();
});

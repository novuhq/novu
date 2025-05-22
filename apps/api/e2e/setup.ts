import { testServer } from '@novu/testing';
import sinon from 'sinon';
import chai from 'chai';
import { Connection } from 'mongoose';
import { DalService } from '@novu/dal';
import { bootstrap } from '../src/bootstrap';
import { S3Client } from '@aws-sdk/client-s3';

let connection: Connection;
const dalService = new DalService();

mockS3Client();

function mockS3Client() {
  const mockSend = sinon.stub().callsFake((command) => {
    const commandName = command.constructor.name;
    
    if (commandName === 'GetObjectCommand') {
      return Promise.resolve({
        Body: {
          transformToByteArray: () => Promise.resolve(new Uint8Array(Buffer.from('mock-data'))),
          transformToString: () => Promise.resolve('mock-data'),
        },
      });
    }
    
    if (commandName === 'PutObjectCommand') {
      return Promise.resolve({});
    }
    
    if (commandName === 'DeleteObjectCommand') {
      return Promise.resolve({});
    }
    
    if (commandName === 'ListBucketsCommand') {
      return Promise.resolve({
        Buckets: [],
      });
    }
    
    return Promise.resolve({});
  });

  sinon.stub(S3Client.prototype, 'send').callsFake(mockSend);

  console.log('S3Client mocked for all tests');
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
  
  (process.env as any).STORAGE_SERVICE = 'AWS';
  (process.env as any).S3_REGION = 'us-east-1';
  (process.env as any).S3_BUCKET_NAME = 'novu-test';
  (process.env as any).S3_LOCAL_STACK = '';
  
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

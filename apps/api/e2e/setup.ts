import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import sinon from 'sinon';
import chai from 'chai';

import { bootstrap } from '../src/bootstrap';
import { isClerkEnabled } from '@novu/shared';

const dalService = new DalService();

async function seedClerkMongo() {
  if (isClerkEnabled()) {
    const clerkClientMock = require('@novu/ee-auth')?.ClerkClientMock;

    if (clerkClientMock) {
      const clerkClient = new clerkClientMock();
      await clerkClient.seedDatabase();
    } else {
      throw new Error('ClerkClientMock not found');
    }
  }
}

before(async () => {
  /**
   * disable truncating for better error messages - https://www.chaijs.com/guide/styles/#configtruncatethreshold
   */
  chai.config.truncateThreshold = 0;
  await testServer.create(await bootstrap());

  await dalService.connect(process.env.MONGO_URL);
  await seedClerkMongo();
});

after(async () => {
  await testServer.teardown();

  try {
    await dalService.destroy();
  } catch (e) {
    if (e.code !== 12586) {
      throw e;
    }
  }
});

afterEach(() => {
  sinon.restore();
});

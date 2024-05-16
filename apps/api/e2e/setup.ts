import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import * as sinon from 'sinon';
import * as chai from 'chai';

import { bootstrap } from '../src/bootstrap';
import { echoServer } from './echo.server';

const dalService = new DalService();

before(async () => {
  /**
   * disable truncating for better error messages - https://www.chaijs.com/guide/styles/#configtruncatethreshold
   */
  chai.config.truncateThreshold = 0;
  await testServer.create(await bootstrap());
  await echoServer.start();

  await dalService.connect(process.env.MONGO_URL);
});

after(async () => {
  await testServer.teardown();
  await echoServer.stop();

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

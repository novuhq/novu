import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import * as sinon from 'sinon';

import { bootstrap } from '../src/bootstrap';

const dalService = new DalService();

before(async () => {
  await dalService.connect(process.env.MONGO_URL);
  await testServer.create(await bootstrap());
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

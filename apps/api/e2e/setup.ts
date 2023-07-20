import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import * as sinon from 'sinon';

import { bootstrap } from '../src/bootstrap';
import { bootstrap as bootstrapWorker } from '../../worker/src/bootstrap';

const dalService = new DalService();

before(async () => {
  process.env.PORT = '1342';
  await bootstrapWorker();

  process.env.PORT = '1337';
  await testServer.create(await bootstrap());
  await dalService.connect(process.env.MONGO_URL);
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

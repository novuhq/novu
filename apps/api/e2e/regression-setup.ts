import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import * as sinon from 'sinon';

import { bootstrap } from '../src/bootstrap';
import { injectDopplerSecrets } from '../src/providers/secrets';

const database = process.env.MONGO_URL || 'mongodb://localhost:27017/novu-regression';

const dalService = new DalService();

before(async () => {
  await injectDopplerSecrets();
  await testServer.create(await bootstrap());
  await dalService.connect(database);
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

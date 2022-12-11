import { DalService } from '@novu/dal';
import { testServer } from '@novu/testing';
import * as sinon from 'sinon';
import { bootstrap } from '../src/bootstrap';
import { CacheService, ICacheService } from '@novu/dal';

const dalService = new DalService();

before(async () => {
  await testServer.create(await bootstrap());
  await dalService.connect(process.env.MONGO_URL);
  testCacheService().connect();
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

export function testCacheService() {
  let cacheService: ICacheService;

  function connect() {
    cacheService = new CacheService({
      cachePort: process.env.REDIS_CACHE_PORT,
      cacheHost: process.env.REDIS_CACHE_HOST,
    });
  }

  return { connect, cacheService };
}

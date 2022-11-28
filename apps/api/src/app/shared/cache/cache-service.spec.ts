import { expect } from 'chai';
import { ICacheService, CachingConfig } from '@novu/dal';

describe('cache-service', function () {
  let cacheService: ICacheService;
  before(function () {
    cacheService = CacheService.createClient();
  });

  after(function (done) {
    cacheService.delByPattern('*');
    done();
  });

  it('should store data in cache', async function () {
    const key = '123:456';
    const dataString = JSON.stringify({ array: [1, 2, 3] });
    cacheService.set(key, dataString);
    const res = cacheService.get(key);

    expect(dataString).to.be.equal(res);
  });
});

export const CacheService = {
  createClient(): ICacheService {
    let data = {};
    return {
      set(key: string, value: string, options?: CachingConfig) {
        data[key] = value;
      },
      get(key: string) {
        return data[key];
      },
      del(key: string) {
        delete data[key];
        return;
      },
      delByPattern(pattern?: string) {
        data = {};
        return;
      },
      keys(pattern?: string) {
        return Object.keys(data);
      },
      getStatus() {
        return 'ready';
      },
    };
  },
};

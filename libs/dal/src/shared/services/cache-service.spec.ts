import { expect } from 'chai';
import { CachingConfig, ICacheService } from './cache.service';

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

  it('should delete by pattern', async function () {
    cacheService.set('feed:123:456', 'random data');
    cacheService.set('feed:123:457', 'random data');
    cacheService.set('feed:query:123:457', 'random data');

    cacheService.delByPattern('feed*:123:457');

    const res1 = cacheService.get('feed:123:456');
    const res2 = cacheService.get('feed:123:457');
    const res3 = cacheService.get('feed:query:123:457');

    expect(res1).to.be.equal('random data');
    expect(res2).to.be.equal(undefined);
    expect(res3).to.be.equal(undefined);
  });
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const CacheService = {
  createClient(): ICacheService {
    const data = {};

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
        const preFixSuffixTuple = pattern.split('*');

        for (const key in data) {
          if (key.startsWith(preFixSuffixTuple[0]) && key.endsWith(preFixSuffixTuple[1])) delete data[key];
        }

        return;
      },
      keys(pattern?: string) {
        return Object.keys(data);
      },
      getStatus() {
        return 'ready';
      },
      cacheEnabled() {
        return true;
      },
    };
  },
};

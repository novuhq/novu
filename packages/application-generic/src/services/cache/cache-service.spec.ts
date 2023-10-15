import {
  CacheService,
  CachingConfig,
  ICacheService,
  splitKey,
} from './cache.service';

import {
  InMemoryProviderEnum,
  InMemoryProviderService,
} from '../in-memory-provider';

const enableAutoPipelining =
  process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';

/**
 * TODO: Maybe create a Test single Redis instance to be able to run it in the
 * pipeline. Local wise they work
 */
describe.skip('Cache Service - Redis Instance - Non Cluster Mode', () => {
  let cacheService: CacheService;
  let inMemoryProviderService: InMemoryProviderService;

  beforeAll(async () => {
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    inMemoryProviderService = new InMemoryProviderService(
      InMemoryProviderEnum.REDIS,
      enableAutoPipelining
    );
    await inMemoryProviderService.delayUntilReadiness();
    expect(inMemoryProviderService.isClusterMode()).toBe(false);

    cacheService = new CacheService(inMemoryProviderService);
    await cacheService.initialize();
  });

  afterAll(async () => {
    await inMemoryProviderService.shutdown();
  });

  it('should be instantiated properly', async () => {
    expect(cacheService.getStatus()).toEqual('ready');
    expect(cacheService.getTtl()).toEqual(7200);
    expect(cacheService.cacheEnabled()).toEqual(true);
  });

  it('should be able to add a key / value in the instance', async () => {
    const result = await cacheService.set('instance-key1', 'value1');
    expect(result).toBe('OK');
    const value = await cacheService.get('instance-key1');
    expect(value).toBe('value1');
  });

  it('should be able to delete a key / value in the instance', async () => {
    const result = await cacheService.del('instance-key1');
    expect(result).toBe(1);
    const value = await cacheService.get('instance-key1');
    expect(value).toBe(null);
  });

  it('should be able to add a compound key in the instance', async () => {
    const compoundKey =
      '{entity:notification_template:e=64b34d4908c2e563cccc20aa:i=64b34d4908c2e563cccc2b2f}';
    const result = await cacheService.set(compoundKey, 'whatever');
    expect(result).toBe('OK');
    const value = await cacheService.get(compoundKey);
    expect(value).toBe('whatever');
  });

  it('should be able to delete a compound key in the instance', async () => {
    const compoundKey =
      '{entity:notification_template:e=64b34d4908c2e563cccc20aa:i=64b34d4908c2e563cccc2b2f}';
    const result = await cacheService.del(compoundKey);
    expect(result).toBe(1);
    const value = await cacheService.get(compoundKey);
    expect(value).toBe(null);
  });
});

describe('Cache Service - Cluster Mode', () => {
  let cacheService: CacheService;
  let inMemoryProviderService: InMemoryProviderService;

  beforeAll(async () => {
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

    inMemoryProviderService = new InMemoryProviderService(
      InMemoryProviderEnum.REDIS,
      enableAutoPipelining
    );
    await inMemoryProviderService.delayUntilReadiness();
    expect(inMemoryProviderService.isClusterMode()).toBe(true);

    cacheService = new CacheService(inMemoryProviderService);
    await cacheService.initialize();
  });

  afterAll(async () => {
    await inMemoryProviderService.shutdown();
  });

  it('should be instantiated properly', async () => {
    expect(cacheService.getStatus()).toEqual('ready');
    expect(cacheService.getTtl()).toEqual(7200);
    expect(cacheService.cacheEnabled()).toEqual(true);
  });

  it('should be able to add a key / value in the Redis Cluster', async () => {
    const result = await cacheService.set('key1', 'value1');
    expect(result).toBe('OK');
    const value = await cacheService.get('key1');
    expect(value).toBe('value1');
  });

  it('should be able to delete a key / value in the Redis Cluster', async () => {
    const result = await cacheService.del('key1');
    expect(result).toBe(1);
    const value = await cacheService.get('key1');
    expect(value).toBe(null);
  });

  it('should be able to add a compound key in the Redis Cluster', async () => {
    const compoundKey =
      '{entity:notification_template:e=64b34d4908c2e563cccc19dd:i=64b34d4908c2e563cccc1a1f}';
    const result = await cacheService.set(compoundKey, 'whatever');
    expect(result).toBe('OK');
    const value = await cacheService.get(compoundKey);
    expect(value).toBe('whatever');
  });

  it('should be able to delete a compound key in the Redis Cluster', async () => {
    const compoundKey =
      '{entity:notification_template:e=64b34d4908c2e563cccc19dd:i=64b34d4908c2e563cccc1a1f}';
    const result = await cacheService.del(compoundKey);
    expect(result).toBe(1);
    const value = await cacheService.get(compoundKey);
    expect(value).toBe(null);
  });
});

describe('cache-service', function () {
  let cacheService: ICacheService;

  beforeEach(function () {
    cacheService = MockCacheService.createClient();
  });

  afterEach(function (done) {
    cacheService.delByPattern('*');
    done();
  });

  it('should store data in cache', async function () {
    const key = '123:456';
    const dataString = JSON.stringify({ array: [1, 2, 3] });
    cacheService.set(key, dataString);
    const res = cacheService.get(key);

    expect(dataString).toEqual(res);
  });

  it('should delete by pattern', async function () {
    cacheService.set('feed:123:456', 'random data');
    cacheService.set('feed:123:457', 'random data');
    cacheService.set('feed:query:123:457', 'random data');

    cacheService.delByPattern('feed*:123:457');

    const res1 = cacheService.get('feed:123:456');
    const res2 = cacheService.get('feed:123:457');
    const res3 = cacheService.get('feed:query:123:457');

    expect(res1).toEqual('random data');
    expect(res2).toEqual(undefined);
    expect(res3).toEqual(undefined);
  });

  describe('splitKey', () => {
    it('should split the key into credentials and query parts', () => {
      const key =
        'query:integration:e=642578cea9684e9ebea5b04c:#query#={\\"channelType\\":\\"email\\",\\"findOne\\":true}';
      const result = splitKey(key);
      expect(result.credentials).toEqual(
        'query:integration:e=642578cea9684e9ebea5b04c'
      );
      expect(result.query).toEqual(
        '{\\"channelType\\":\\"email\\",\\"findOne\\":true}'
      );
    });

    it('should handle keys without a query part', () => {
      const key = 'query:integration:e=642578cea9684e9ebea5b04c:#query#=';
      const result = splitKey(key);
      expect(result.credentials).toEqual(
        'query:integration:e=642578cea9684e9ebea5b04c'
      );
      expect(result.query).toEqual('');
    });

    it('should handle keys without a credentials part', () => {
      const key = ':#query#={\\"channelType\\":\\"email\\",\\"findOne\\":true}';
      const result = splitKey(key);
      expect(result.credentials).toEqual('');
      expect(result.query).toEqual(
        '{\\"channelType\\":\\"email\\",\\"findOne\\":true}'
      );
    });
  });
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MockCacheService = {
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
        const preFixSuffixTuple = pattern?.split('*');

        if (!preFixSuffixTuple) return;

        for (const key in data) {
          if (
            key.startsWith(preFixSuffixTuple[0]) &&
            key.endsWith(preFixSuffixTuple[1])
          )
            delete data[key];
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

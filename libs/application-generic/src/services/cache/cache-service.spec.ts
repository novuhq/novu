import sinon from 'sinon';
import { CacheInMemoryProviderService, Redis } from '../in-memory-provider';
import { CacheService, CachingConfig, ICacheService, splitKey } from './cache.service';
import { MockCacheService } from './cache-service.mock';

function buildFakeProvider({ isCluster }: { isCluster: boolean }) {
  const store = new Map<string, string>();
  const client = {
    set: vi.fn(async (key: string, value: string | number, ...args: Array<string | number>) => {
      if (args.includes('NX') && store.has(key)) {
        return null;
      }
      store.set(key, String(value));

      return 'OK';
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    del: vi.fn(async (keys: string[]) => keys.filter((key) => store.delete(key)).length),
  };
  const provider = {
    initialize: vi.fn(async () => {}),
    getTtl: () => 7200,
    getClient: () => client,
    getClientStatus: () => 'ready',
    isReady: () => true,
    providerInUseIsInClusterMode: () => isCluster,
  };

  return { provider: provider as unknown as CacheInMemoryProviderService, client };
}

/**
 * Runs against a fake in-memory client, so no Redis instance is needed. The cache service
 * behaves the same for a single instance and a cluster, so both modes share the same cases.
 */
describe.each([
  { mode: 'Cluster Mode', isCluster: true },
  { mode: 'Non Cluster Mode', isCluster: false },
])('Cache Service - $mode', ({ isCluster }) => {
  let cacheService: CacheService;

  beforeEach(async () => {
    cacheService = new CacheService(buildFakeProvider({ isCluster }).provider);
    await cacheService.initialize();
  });

  it('should be instantiated properly', async () => {
    expect(cacheService.getStatus()).toEqual('ready');
    expect(cacheService.getTtl()).toEqual(7200);
    expect(cacheService.cacheEnabled()).toEqual(true);
  });

  it('should be able to add a key / value', async () => {
    const result = await cacheService.set('key1', 'value1');
    expect(result).toBe('OK');
    const value = await cacheService.get('key1');
    expect(value).toBe('value1');
  });

  it('should be able to add a key / value if key not exist', async () => {
    const result = await cacheService.setIfNotExist('key1-not-exist', 'value1');
    expect(result).toBe('OK');
    const result1 = await cacheService.setIfNotExist('key1-not-exist', 'value1');
    expect(result1).toBeFalsy();
  });

  it('should be able to delete a key / value', async () => {
    await cacheService.set('key1', 'value1');
    const result = await cacheService.del('key1');
    expect(result).toBe(1);
    const value = await cacheService.get('key1');
    expect(value).toBe(null);
  });

  it('should be able to add a compound key', async () => {
    const compoundKey = '{entity:notification_template:e=64b34d4908c2e563cccc19dd:i=64b34d4908c2e563cccc1a1f}';
    const result = await cacheService.set(compoundKey, 'whatever');
    expect(result).toBe('OK');
    const value = await cacheService.get(compoundKey);
    expect(value).toBe('whatever');
  });

  it('should be able to delete a compound key', async () => {
    const compoundKey = '{entity:notification_template:e=64b34d4908c2e563cccc19dd:i=64b34d4908c2e563cccc1a1f}';
    await cacheService.set(compoundKey, 'whatever');
    const result = await cacheService.del(compoundKey);
    expect(result).toBe(1);
    const value = await cacheService.get(compoundKey);
    expect(value).toBe(null);
  });
});

describe('CacheService TTL', () => {
  let cacheService: CacheService;
  let clientSet: sinon.SinonStub;

  beforeEach(async () => {
    const client: Redis = Object.create(Redis.prototype);
    clientSet = sinon.stub(client, 'set').resolves('OK');
    const cacheInMemoryProviderService: CacheInMemoryProviderService = Object.create(
      CacheInMemoryProviderService.prototype
    );
    sinon.stub(cacheInMemoryProviderService, 'initialize').resolves();
    sinon.stub(cacheInMemoryProviderService, 'getTtl').returns(7200);
    sinon.stub(cacheInMemoryProviderService, 'getClient').returns(client);

    cacheService = new CacheService(cacheInMemoryProviderService);
    await cacheService.initialize();
    sinon.stub(Math, 'random').returns(0);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should set the exact ttl when jitter is disabled', async () => {
    await cacheService.set('key', 'value', { ttl: 1000, jitter: false });

    expect(clientSet.args).toEqual([['key', 'value', 'EX', 1000]]);
  });

  it('should set the exact default ttl when jitter is disabled without a ttl', async () => {
    await cacheService.set('key', 'value', { jitter: false });

    expect(clientSet.args).toEqual([['key', 'value', 'EX', 7200]]);
  });

  it('should set if not exist with the exact ttl when jitter is disabled', async () => {
    await cacheService.setIfNotExist('key', 'value', { ttl: 1000, jitter: false });

    expect(clientSet.args).toEqual([['key', 'value', 'EX', 1000, 'NX']]);
  });

  it('should round a fractional exact ttl up to whole seconds', async () => {
    await cacheService.set('key', 'value', { ttl: 1000.2, jitter: false });

    expect(clientSet.args).toEqual([['key', 'value', 'EX', 1001]]);
  });

  it('should jitter the ttl by default', async () => {
    await cacheService.set('key', 'value', { ttl: 1000 });

    expect(clientSet.args).toEqual([['key', 'value', 'EX', 950]]);
  });
});

describe('cache-service', () => {
  let cacheService: ICacheService;

  beforeEach(() => {
    cacheService = MockCacheService.createClient();
  });

  afterEach(async () => {
    await cacheService.delByPattern('*');
  });

  it('should store data in cache', async () => {
    const key = '123:456';
    const dataString = JSON.stringify({ array: [1, 2, 3] });
    cacheService.set(key, dataString);
    const res = cacheService.get(key);

    expect(dataString).toEqual(res);
  });

  it('should delete by pattern', async () => {
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

  it('should invoke the SADD method correctly', async () => {
    const key = '123:456';
    const data = [1, 2, 3];
    const res = await cacheService.sadd(key, ...data);
    const res2 = await cacheService.sadd(key, ...data);

    expect(res).toEqual(3);
    expect(res2).toEqual(0);
  });

  it('should invoke the EVAL function correctly', async () => {
    const dataString = JSON.stringify({ array: [1, 2, 3] });
    const evalMock = sinon.mock().resolves(dataString);
    cacheService = MockCacheService.createClient({ eval: evalMock });

    const script = 'return redis.call("get", KEYS[1])';
    const key = '123:456';
    const args = ['arg1', 'arg2'];
    cacheService.set(key, dataString);
    const res = await cacheService.eval(script, [key], args);

    expect(res).toEqual(dataString);
    expect(evalMock.calledWith(script, 1, key, 'arg1', 'arg2')).toEqual(true);
  });

  describe('splitKey', () => {
    it('should split the key into credentials and query parts', () => {
      const key =
        'query:integration:e=642578cea9684e9ebea5b04c:#query#={\\"channelType\\":\\"email\\",\\"findOne\\":true}';
      const result = splitKey(key);
      expect(result.credentials).toEqual('query:integration:e=642578cea9684e9ebea5b04c');
      expect(result.query).toEqual('{\\"channelType\\":\\"email\\",\\"findOne\\":true}');
    });

    it('should handle keys without a query part', () => {
      const key = 'query:integration:e=642578cea9684e9ebea5b04c:#query#=';
      const result = splitKey(key);
      expect(result.credentials).toEqual('query:integration:e=642578cea9684e9ebea5b04c');
      expect(result.query).toEqual('');
    });

    it('should handle keys without a credentials part', () => {
      const key = ':#query#={\\"channelType\\":\\"email\\",\\"findOne\\":true}';
      const result = splitKey(key);
      expect(result.credentials).toEqual('');
      expect(result.query).toEqual('{\\"channelType\\":\\"email\\",\\"findOne\\":true}');
    });
  });
});

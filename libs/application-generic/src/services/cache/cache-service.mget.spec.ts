import { CacheService } from './cache.service';

function buildCacheService({ isCluster, store }: { isCluster: boolean; store: Record<string, string> }) {
  const client = {
    get: jest.fn(async (key: string) => store[key] ?? null),
    mget: jest.fn(async (keys: string[]) => keys.map((key) => store[key] ?? null)),
  };
  const provider = {
    getClient: () => client,
    providerInUseIsInClusterMode: () => isCluster,
  };

  return { cacheService: new CacheService(provider as never), client };
}

describe('CacheService.mget', () => {
  const store = { '{a}': '1', '{c}': '3' };

  it('returns values in key order with null for missing keys', async () => {
    const { cacheService, client } = buildCacheService({ isCluster: false, store });

    await expect(cacheService.mget(['{a}', '{b}', '{c}'])).resolves.toEqual(['1', null, '3']);
    expect(client.mget).toHaveBeenCalledWith(['{a}', '{b}', '{c}']);
  });

  it('reads each key on its own in cluster mode, since the keys hash to different slots', async () => {
    const { cacheService, client } = buildCacheService({ isCluster: true, store });

    await expect(cacheService.mget(['{a}', '{b}', '{c}'])).resolves.toEqual(['1', null, '3']);
    expect(client.mget).not.toHaveBeenCalled();
    expect(client.get).toHaveBeenCalledTimes(3);
  });

  it('reads every key as missing when there is no client', async () => {
    const cacheService = new CacheService({ getClient: () => undefined } as never);

    await expect(cacheService.mget(['{a}', '{b}'])).resolves.toEqual([null, null]);
  });

  it('does not call Redis for an empty key list', async () => {
    const { cacheService, client } = buildCacheService({ isCluster: false, store });

    await expect(cacheService.mget([])).resolves.toEqual([]);
    expect(client.mget).not.toHaveBeenCalled();
  });
});

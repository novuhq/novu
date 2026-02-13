import { Test } from '@nestjs/testing';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { FeatureFlagsService } from '../feature-flags';
import { InMemoryLRUCacheService } from './in-memory-lru-cache.service';
import { InMemoryLRUCacheStore } from './in-memory-lru-cache.store';

describe('InMemoryLRUCacheService', () => {
  let service: InMemoryLRUCacheService;
  let featureFlagsService: jest.Mocked<FeatureFlagsService>;

  beforeEach(async () => {
    const mockFeatureFlagsService = {
      getFlag: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        InMemoryLRUCacheService,
        {
          provide: FeatureFlagsService,
          useValue: mockFeatureFlagsService,
        },
      ],
    }).compile();

    service = module.get<InMemoryLRUCacheService>(InMemoryLRUCacheService);
    featureFlagsService = module.get(FeatureFlagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.invalidateAll(InMemoryLRUCacheStore.WORKFLOW);
    service.invalidateAll(InMemoryLRUCacheStore.ORGANIZATION);
    service.invalidateAll(InMemoryLRUCacheStore.VALIDATOR);
  });

  describe('get', () => {
    it('should fetch and cache value when cache is enabled', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const fetchFn = jest.fn().mockResolvedValue({ id: '123', name: 'test' });

      const result = await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key1', fetchFn, {
        environmentId: 'env1',
        organizationId: 'org1',
      });

      expect(result).toEqual({ id: '123', name: 'test' });
      expect(fetchFn).toHaveBeenCalledTimes(1);

      const cachedResult = await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key1', fetchFn, {
        environmentId: 'env1',
        organizationId: 'org1',
      });

      expect(cachedResult).toEqual({ id: '123', name: 'test' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should not cache null or undefined values', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const fetchFn = jest.fn().mockResolvedValue(null);

      const result = await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key2', fetchFn, {
        environmentId: 'env1',
      });

      expect(result).toBeNull();
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key2', fetchFn, {
        environmentId: 'env1',
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should bypass cache when skipCache is true', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const fetchFn = jest.fn().mockResolvedValue({ id: '456' });

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key3', fetchFn, {
        environmentId: 'env1',
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key3', fetchFn, {
        environmentId: 'env1',
        skipCache: true,
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate concurrent requests', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      let resolveCount = 0;
      const fetchFn = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolveCount++;
              resolve({ id: resolveCount });
            }, 10);
          })
      );

      const [result1, result2, result3] = await Promise.all([
        service.get(InMemoryLRUCacheStore.WORKFLOW, 'key4', fetchFn, { environmentId: 'env1' }),
        service.get(InMemoryLRUCacheStore.WORKFLOW, 'key4', fetchFn, { environmentId: 'env1' }),
        service.get(InMemoryLRUCacheStore.WORKFLOW, 'key4', fetchFn, { environmentId: 'env1' }),
      ]);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ id: 1 });
      expect(result2).toEqual({ id: 1 });
      expect(result3).toEqual({ id: 1 });
    });

    it('should bypass cache when feature flag is disabled', async () => {
      featureFlagsService.getFlag.mockResolvedValue(false);
      const fetchFn = jest.fn().mockResolvedValue({ id: '789' });

      const result = await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key5', fetchFn, {
        environmentId: 'env1',
      });

      expect(result).toEqual({ id: '789' });
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key5', fetchFn, {
        environmentId: 'env1',
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should skip feature flag check for VALIDATOR store', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ validator: 'fn' });

      await service.get(InMemoryLRUCacheStore.VALIDATOR, 'key6', fetchFn);

      expect(featureFlagsService.getFlag).not.toHaveBeenCalled();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should handle different stores independently', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const workflowFn = jest.fn().mockResolvedValue({ type: 'workflow' });
      const orgFn = jest.fn().mockResolvedValue({ type: 'org' });

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key7', workflowFn, { environmentId: 'env1' });
      await service.get(InMemoryLRUCacheStore.ORGANIZATION, 'key7', orgFn, { environmentId: 'env1' });

      expect(workflowFn).toHaveBeenCalledTimes(1);
      expect(orgFn).toHaveBeenCalledTimes(1);
    });

    it('should isolate cache entries by cacheVariant', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const fetchFn1 = jest.fn().mockResolvedValue({ id: '1', projection: 'variant1' });
      const fetchFn2 = jest.fn().mockResolvedValue({ id: '2', projection: 'variant2' });

      const result1 = await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-variant', fetchFn1, {
        environmentId: 'env1',
        cacheVariant: 'variant1',
      });

      const result2 = await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-variant', fetchFn2, {
        environmentId: 'env1',
        cacheVariant: 'variant2',
      });

      expect(fetchFn1).toHaveBeenCalledTimes(1);
      expect(fetchFn2).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ id: '1', projection: 'variant1' });
      expect(result2).toEqual({ id: '2', projection: 'variant2' });

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-variant', fetchFn1, {
        environmentId: 'env1',
        cacheVariant: 'variant1',
      });

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-variant', fetchFn2, {
        environmentId: 'env1',
        cacheVariant: 'variant2',
      });

      expect(fetchFn1).toHaveBeenCalledTimes(1);
      expect(fetchFn2).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent requests per variant', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      let resolveCount1 = 0;
      let resolveCount2 = 0;
      const fetchFn1 = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolveCount1++;
              resolve({ id: resolveCount1, variant: 'v1' });
            }, 10);
          })
      );
      const fetchFn2 = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolveCount2++;
              resolve({ id: resolveCount2, variant: 'v2' });
            }, 10);
          })
      );

      const [result1a, result1b, result1c] = await Promise.all([
        service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-dedup', fetchFn1, {
          environmentId: 'env1',
          cacheVariant: 'v1',
        }),
        service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-dedup', fetchFn1, {
          environmentId: 'env1',
          cacheVariant: 'v1',
        }),
        service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-dedup', fetchFn1, {
          environmentId: 'env1',
          cacheVariant: 'v1',
        }),
      ]);

      const [result2a, result2b] = await Promise.all([
        service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-dedup', fetchFn2, {
          environmentId: 'env1',
          cacheVariant: 'v2',
        }),
        service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-dedup', fetchFn2, {
          environmentId: 'env1',
          cacheVariant: 'v2',
        }),
      ]);

      expect(fetchFn1).toHaveBeenCalledTimes(1);
      expect(fetchFn2).toHaveBeenCalledTimes(1);
      expect(result1a).toEqual({ id: 1, variant: 'v1' });
      expect(result1b).toEqual({ id: 1, variant: 'v1' });
      expect(result1c).toEqual({ id: 1, variant: 'v1' });
      expect(result2a).toEqual({ id: 1, variant: 'v2' });
      expect(result2b).toEqual({ id: 1, variant: 'v2' });
    });
  });

  describe('getIfCached', () => {
    it('should return undefined for non-existent key', () => {
      const result = service.getIfCached(InMemoryLRUCacheStore.WORKFLOW, 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return cached value without calling fetch', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const fetchFn = jest.fn().mockResolvedValue({ id: 'abc' });

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key8', fetchFn, { environmentId: 'env1' });

      const cached = service.getIfCached(InMemoryLRUCacheStore.WORKFLOW, 'key8');

      expect(cached).toEqual({ id: 'abc' });
    });
  });

  describe('invalidate', () => {
    it('should remove specific key from cache', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const fetchFn = jest.fn().mockResolvedValue({ id: 'xyz' });

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key9', fetchFn, { environmentId: 'env1' });

      expect(fetchFn).toHaveBeenCalledTimes(1);

      service.invalidate(InMemoryLRUCacheStore.WORKFLOW, 'key9');

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key9', fetchFn, { environmentId: 'env1' });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should invalidate all variants for a base key', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const fetchFn1 = jest.fn().mockResolvedValue({ id: '1', variant: 'v1' });
      const fetchFn2 = jest.fn().mockResolvedValue({ id: '2', variant: 'v2' });
      const fetchFnBase = jest.fn().mockResolvedValue({ id: 'base' });

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-invalidate', fetchFnBase, { environmentId: 'env1' });
      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-invalidate', fetchFn1, {
        environmentId: 'env1',
        cacheVariant: 'v1',
      });
      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-invalidate', fetchFn2, {
        environmentId: 'env1',
        cacheVariant: 'v2',
      });

      expect(fetchFnBase).toHaveBeenCalledTimes(1);
      expect(fetchFn1).toHaveBeenCalledTimes(1);
      expect(fetchFn2).toHaveBeenCalledTimes(1);

      service.invalidate(InMemoryLRUCacheStore.WORKFLOW, 'key-invalidate');

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-invalidate', fetchFnBase, { environmentId: 'env1' });
      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-invalidate', fetchFn1, {
        environmentId: 'env1',
        cacheVariant: 'v1',
      });
      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key-invalidate', fetchFn2, {
        environmentId: 'env1',
        cacheVariant: 'v2',
      });

      expect(fetchFnBase).toHaveBeenCalledTimes(2);
      expect(fetchFn1).toHaveBeenCalledTimes(2);
      expect(fetchFn2).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateAll', () => {
    it('should clear entire store', async () => {
      featureFlagsService.getFlag.mockResolvedValue(true);
      const fetchFn1 = jest.fn().mockResolvedValue({ id: '1' });
      const fetchFn2 = jest.fn().mockResolvedValue({ id: '2' });

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key10', fetchFn1, { environmentId: 'env1' });
      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key11', fetchFn2, { environmentId: 'env1' });

      expect(fetchFn1).toHaveBeenCalledTimes(1);
      expect(fetchFn2).toHaveBeenCalledTimes(1);

      service.invalidateAll(InMemoryLRUCacheStore.WORKFLOW);

      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key10', fetchFn1, { environmentId: 'env1' });
      await service.get(InMemoryLRUCacheStore.WORKFLOW, 'key11', fetchFn2, { environmentId: 'env1' });

      expect(fetchFn1).toHaveBeenCalledTimes(2);
      expect(fetchFn2).toHaveBeenCalledTimes(2);
    });
  });
});

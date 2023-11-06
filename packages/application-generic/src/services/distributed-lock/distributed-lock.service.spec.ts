/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Redlock from 'redlock';
import { setTimeout } from 'timers/promises';

import { DistributedLockService } from './distributed-lock.service';
import { FeatureFlagsService } from '../feature-flags.service';
import {
  InMemoryProviderClient,
  InMemoryProviderEnum,
  CacheInMemoryProviderService,
} from '../in-memory-provider';

const originalRedisCacheServiceHost = (process.env.REDIS_CACHE_SERVICE_HOST =
  process.env.REDIS_CACHE_SERVICE_HOST ?? 'localhost');
const originalRedisCacheServicePort = (process.env.REDIS_CACHE_SERVICE_PORT =
  process.env.REDIS_CACHE_SERVICE_PORT ?? '6379');
const originalRedisClusterServiceHost = process.env.REDIS_CLUSTER_SERVICE_HOST;
const originalRedisClusterServicePorts =
  process.env.REDIS_CLUSTER_SERVICE_PORTS;

const spyDecreaseLockCounter = jest.spyOn(
  DistributedLockService.prototype,
  <any>'decreaseLockCounter'
);
const spyIncreaseLockCounter = jest.spyOn(
  DistributedLockService.prototype,
  <any>'increaseLockCounter'
);
const spyLock = jest.spyOn(Redlock.prototype, 'acquire');
const spyUnlock = jest.spyOn(Redlock.prototype, 'unlock');

describe('Distributed Lock Service', () => {
  afterEach(() => {
    spyDecreaseLockCounter.mockClear();
    spyIncreaseLockCounter.mockClear();
    spyLock.mockClear();
    spyUnlock.mockClear();
  });

  describe('In-memory provider service set', () => {
    let cacheInMemoryProviderService: CacheInMemoryProviderService;
    let distributedLockService: DistributedLockService;

    beforeEach(async () => {
      cacheInMemoryProviderService = new CacheInMemoryProviderService();

      await cacheInMemoryProviderService.initialize();

      expect(cacheInMemoryProviderService.getClientStatus()).toEqual('ready');

      distributedLockService = new DistributedLockService(
        cacheInMemoryProviderService
      );
      await distributedLockService.initialize();
    });

    afterAll(async () => {
      await distributedLockService.shutdown();
    });

    describe('Set up', () => {
      it('should have made a connection to the unique instance implemented', async () => {
        expect(distributedLockService.distributedLock).toBeDefined();
        expect(distributedLockService.instances.length).toEqual(1);

        const client = distributedLockService.instances[0];
        expect(await client!.ping()).toEqual('PONG');
        expect(client!.status).toEqual('ready');
        expect(client!.isCluster).toEqual(
          process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED === 'true'
        );
      });

      it('should have default settings', () => {
        expect(distributedLockService.distributedLock.driftFactor).toEqual(
          0.01
        );
        expect(distributedLockService.distributedLock.retryCount).toEqual(50);
        expect(distributedLockService.distributedLock.retryDelay).toEqual(100);
        expect(distributedLockService.distributedLock.retryJitter).toEqual(200);
      });
    });

    describe('Shutdown side effects', () => {
      it('should not allow the signal to shutdown if not all locks are released', () => {
        const lockCounter = {
          lock1: 2,
          lock2: 0,
          lock3: undefined,
        };

        distributedLockService.lockCounter = lockCounter;

        const result = distributedLockService.areAllLocksReleased();
        expect(result).toEqual(false);
      });

      it('should allow the signal to shutdown if  all locks are released', () => {
        const lockCounter = {
          lock1: 0,
          lock2: 0,
          lock3: undefined,
          lock4: null,
        };

        distributedLockService.lockCounter = lockCounter;

        const result = distributedLockService.areAllLocksReleased();
        expect(result).toEqual(true);
      });
    });

    describe('Cluster sharding autopipelining', () => {
      it('should build the resource with the right prefix if environment is in the key', () => {
        const resource = 'user:1:template:1:environment:90210';
        const resourceWithPrefix =
          distributedLockService.buildResourceWithPrefix(resource);
        expect(resourceWithPrefix).toEqual(
          `{environmentId:90210}user:1:template:1:environment:90210`
        );
      });

      it('should not build the resource with the right prefix if environment is not in the key', () => {
        const resource = 'user:1:template:1';
        const resourceWithoutPrefix =
          distributedLockService.buildResourceWithPrefix(resource);
        expect(resourceWithoutPrefix).toEqual(resource);
      });
    });

    describe('Functionalities', () => {
      it('should create lock and it should expire after the TTL set', async () => {
        const resource = 'lock-created';
        const TTL = 1000;
        const handler = async () => setTimeout(1.5 * TTL);
        const client = distributedLockService.instances[0];

        distributedLockService.applyLock({ resource, ttl: TTL }, handler);
        const firstTimeout = TTL / 2;
        await setTimeout(firstTimeout);

        let resourceExists = await client!.exists(resource);
        expect(resourceExists).toEqual(1);
        // TTL + this time should be less than the handler set one to see that the self expiration works
        await setTimeout(firstTimeout * 2 + 10);
        resourceExists = await client!.exists(resource);
        expect(resourceExists).toEqual(0);

        expect(spyLock).toHaveBeenNthCalledWith(1, [resource], TTL);
        expect(spyIncreaseLockCounter).toHaveBeenCalledTimes(1);
        // Unlock is still called even when the lock expires by going over TTL but errors
        expect(spyUnlock).toHaveBeenCalledTimes(1);
      });

      it('should create lock and it should expire if the handler throws', async () => {
        const client = distributedLockService.instances[0];

        const resource = 'lock-created-but-handler-throws';
        const TTL = 100;
        const handler = async () => {
          const resourceExists = await client!.exists(resource);
          expect(resourceExists).toEqual(1);

          throw new Error();
        };

        try {
          const result = await distributedLockService.applyLock(
            { resource, ttl: TTL },
            handler
          );
          expect(result).not.toBeDefined();
        } catch {
          const resourceExists = await client!.exists(resource);
          expect(resourceExists).toEqual(0);
        }

        expect(spyLock).toHaveBeenNthCalledWith(1, [resource], TTL);
        expect(spyIncreaseLockCounter).toHaveBeenCalledTimes(1);
        expect(spyDecreaseLockCounter).toHaveBeenCalledTimes(1);
        expect(spyUnlock).toHaveBeenCalledTimes(1);
      });

      it('should create a lock and process after any other sequential call while lock is enabled', async () => {
        const resource = 'lock-created-and-sequential-calls';
        const TTL = 500;
        const expectedResult: Record<string, boolean> = {
          firstCall: false,
          secondCall: false,
        };

        const action = async (fn: () => Promise<void>): Promise<void> => {
          await distributedLockService.applyLock({ resource, ttl: TTL }, fn);
        };

        const firstCall = async () => {
          await setTimeout(50);
          expectedResult.firstCall = true;
        };

        const secondCall = async () => {
          expectedResult.secondCall = true;
        };

        await action(firstCall);
        await action(secondCall);

        expect(expectedResult).toEqual({
          firstCall: true,
          secondCall: true,
        });
        expect(spyLock).toHaveBeenCalledTimes(2);
        expect(spyLock).toHaveBeenCalledWith([resource], TTL);
        expect(spyIncreaseLockCounter).toHaveBeenCalledTimes(2);
        expect(spyIncreaseLockCounter).toHaveBeenCalledWith(resource);
        expect(spyDecreaseLockCounter).toHaveBeenCalledTimes(2);
        expect(spyDecreaseLockCounter).toHaveBeenCalledWith(resource);
        expect(spyUnlock).toHaveBeenCalledTimes(2);
      });

      it('should create a lock and process all 5 concurrent calls while lock is enabled but avoiding race conditions', async () => {
        const resource = 'lock-created-and-concurrent-calls';
        const TTL = 500;
        let executed = 0;

        const action = async (fn: () => Promise<void>): Promise<void> => {
          await distributedLockService.applyLock({ resource, ttl: TTL }, fn);
        };

        const call = async () => {
          if (executed < 1) {
            await setTimeout(90);
            executed++;
          }
        };

        await Promise.all([
          action(call),
          action(call),
          action(call),
          action(call),
          action(call),
        ]);

        expect(executed).toEqual(1);
        expect(spyLock).toHaveBeenCalledTimes(5);
        expect(spyLock).toHaveBeenCalledWith([resource], TTL);
        expect(spyIncreaseLockCounter).toHaveBeenCalledTimes(5);
        expect(spyIncreaseLockCounter).toHaveBeenCalledWith(resource);
        expect(spyUnlock.mock.calls.length).toBeGreaterThanOrEqual(5);
      });

      it(`should create a lock and log a release lock error if any of the calls duration is longer than the TTL
         but still execute all calls`, async () => {
        const resource = 'lock-created-and-concurrent-calls-one-over-ttl';
        const TTL = 500;
        let executed = 0;

        const action = async (fn: () => Promise<void>): Promise<void> => {
          await distributedLockService.applyLock({ resource, ttl: TTL }, fn);
        };

        const call = (duration: number) => {
          async function closure() {
            await setTimeout(duration);
            executed++;
          }

          return closure;
        };

        await Promise.all([
          action(call(100)),
          action(call(1000)),
          action(call(90)),
          action(call(56)),
          action(call(89)),
        ]);

        expect(executed).toEqual(5);
        expect(spyLock).toHaveBeenCalledTimes(5);
        expect(spyLock).toHaveBeenCalledWith([resource], TTL);
        expect(spyIncreaseLockCounter).toHaveBeenCalledTimes(5);
        expect(spyIncreaseLockCounter).toHaveBeenCalledWith(resource);
        expect(spyUnlock.mock.calls.length).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('Bypass - In-memory provider service not set', () => {
    let cacheInMemoryProviderService: CacheInMemoryProviderService;
    let distributedLockService: DistributedLockService;

    beforeEach(async () => {
      process.env.REDIS_CACHE_SERVICE_HOST = '';
      process.env.REDIS_CACHE_SERVICE_PORT = '0';
      process.env.REDIS_CLUSTER_SERVICE_HOST = '';
      process.env.REDIS_CLUSTER_SERVICE_PORTS = '';

      cacheInMemoryProviderService = new CacheInMemoryProviderService();
      expect(
        cacheInMemoryProviderService.inMemoryProviderService
          .inMemoryProviderConfig.host
      ).toEqual('localhost');
      distributedLockService = new DistributedLockService(undefined);
      // If no initializing the service is like the client is not properly set
    });

    afterEach(() => {
      process.env.REDIS_CACHE_SERVICE_HOST = originalRedisCacheServiceHost;
      process.env.REDIS_CACHE_SERVICE_PORT = originalRedisCacheServicePort;
      process.env.REDIS_CLUSTER_SERVICE_HOST = originalRedisClusterServiceHost;
      process.env.REDIS_CLUSTER_SERVICE_PORTS =
        originalRedisClusterServicePorts;
    });

    afterAll(async () => {
      await distributedLockService.shutdown();
    });

    describe('No in-memory instance', () => {
      it('should execute the locked code anyway even if no instance to manage the distributed locks', async () => {
        const resource = 'no-lock';
        const TTL = 100;
        const handler = async () => {
          await setTimeout(500);

          return {
            executed: true,
          };
        };

        const result = await distributedLockService.applyLock(
          { resource, ttl: TTL },
          handler
        );
        expect(result).toEqual({ executed: true });

        expect(spyLock).not.toHaveBeenCalled();
        expect(spyIncreaseLockCounter).not.toHaveBeenCalled();
        expect(spyDecreaseLockCounter).not.toHaveBeenCalled();
        expect(spyUnlock).not.toHaveBeenCalled();
      });
    });
  });
});

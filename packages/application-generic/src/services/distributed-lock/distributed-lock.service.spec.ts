import Redis from 'ioredis';
import * as Redlock from 'redlock';
import { setTimeout } from 'timers/promises';

import { DistributedLockService } from './distributed-lock.service';

const distributedLockService = new DistributedLockService();
let redisClient: Redis;
let spyDecreaseLockCounter: jest.SpyInstance;
let spyIncreaseLockCounter: jest.SpyInstance;
let spyLock: jest.SpyInstance;
let spyUnlock: jest.SpyInstance;

beforeEach(() => {
  redisClient = distributedLockService.instances[0];
  spyDecreaseLockCounter = jest.spyOn(
    DistributedLockService.prototype,
    <any>'decreaseLockCounter'
  );
  spyIncreaseLockCounter = jest.spyOn(
    DistributedLockService.prototype,
    <any>'increaseLockCounter'
  );
  spyLock = jest.spyOn(Redlock.prototype, 'acquire');
  spyUnlock = jest.spyOn(Redlock.prototype, 'unlock');
});

afterEach(() => {
  spyDecreaseLockCounter.mockRestore();
  spyIncreaseLockCounter.mockRestore();
  spyLock.mockRestore();
  spyUnlock.mockRestore();
});

describe('Distributed Lock Service', () => {
  describe('Set up', () => {
    it('should have made a connection to the unique instance implemented', async () => {
      expect(distributedLockService.distributedLock).toBeDefined();
      expect(distributedLockService.instances.length).toEqual(1);
      expect(await distributedLockService.instances[0].ping()).toEqual('PONG');
      expect(distributedLockService.instances[0].options.host).toEqual(
        process.env.REDIS_HOST
      );
      expect(distributedLockService.instances[0].options.port).toEqual(
        Number(process.env.REDIS_PORT)
      );
    });

    it('should have default settings', () => {
      expect(distributedLockService.distributedLock.driftFactor).toEqual(0.01);
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

  describe('Functionalities', () => {
    it('should create lock and it should expire after the TTL set', async () => {
      const resource = 'lock-created';
      const TTL = 100;
      const handler = async () => setTimeout(500);

      distributedLockService.applyLock({ resource, ttl: TTL }, handler);

      let resourceExists = await redisClient.exists(resource);
      expect(resourceExists).toEqual(1);
      // TTL + this time should be less than the handler set one to see that the self expiration works
      await setTimeout(TTL + 10);
      resourceExists = await redisClient.exists(resource);
      expect(resourceExists).toEqual(0);

      expect(spyLock).toHaveBeenNthCalledWith(1, [resource], TTL);
      expect(spyIncreaseLockCounter).toHaveBeenCalledTimes(1);
      expect(spyUnlock).toHaveBeenCalled();
    });

    it('should create lock and it should expire if the handler throws', async () => {
      const resource = 'lock-created-but-handler-throws';
      const TTL = 100;
      const handler = async () => {
        const resourceExists = await redisClient.exists(resource);
        expect(resourceExists).toEqual(1);

        throw new Error();
      };

      try {
        const result = await distributedLockService.applyLock(
          { resource, ttl: TTL },
          handler
        );
        expect(result).toBeNull();
      } catch {
        const resourceExists = await redisClient.exists(resource);
        expect(resourceExists).toEqual(0);
      }

      expect(spyLock).toHaveBeenNthCalledWith(1, [resource], TTL);
      expect(spyIncreaseLockCounter).toHaveBeenCalledTimes(1);
      expect(spyUnlock).toHaveBeenCalled();
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

      expect(expectedResult).toEqual({ firstCall: true, secondCall: true });
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
      expect(spyUnlock).toBeGreaterThanOrEqual(5);
    });

    it('should create a lock and log a release lock error if any of the calls duration is longer than the TTL but still execute all calls', async () => {
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
      expect(spyUnlock).toBeGreaterThanOrEqual(5);
    });
  });
});

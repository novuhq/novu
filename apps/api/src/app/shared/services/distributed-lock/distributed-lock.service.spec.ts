import { expect } from 'chai';
import * as sinon from 'sinon';
import type { SinonSpy } from 'sinon';
import Redis from 'ioredis';
import * as Redlock from 'redlock';
import { setTimeout } from 'timers/promises';

import { InMemoryProviderClient, InMemoryProviderService } from '../in-memory-provider';
import { DistributedLockService } from './distributed-lock.service';

const originalRedisCacheServiceHost = process.env.REDIS_CACHE_SERVICE_HOST;
const originalRedisCacheServicePort = process.env.REDIS_CACHE_SERVICE_PORT;
const originalRedisClusterServiceHost = process.env.REDIS_CLUSTER_SERVICE_HOST;
const originalRedisClusterServicePorts = process.env.REDIS_CLUSTER_SERVICE_PORTS;

let spyDecreaseLockCounter: SinonSpy;
let spyIncreaseLockCounter: SinonSpy;
let spyLock: SinonSpy;
let spyUnlock: SinonSpy;

beforeEach(() => {
  spyDecreaseLockCounter = sinon.spy(DistributedLockService.prototype, <any>'decreaseLockCounter');
  spyIncreaseLockCounter = sinon.spy(DistributedLockService.prototype, <any>'increaseLockCounter');
  spyLock = sinon.spy(Redlock.prototype, 'acquire');
  spyUnlock = sinon.spy(Redlock.prototype, 'unlock');
});

afterEach(() => {
  spyDecreaseLockCounter.restore();
  spyIncreaseLockCounter.restore();
  spyLock.restore();
  spyUnlock.restore();
});

describe('Distributed Lock Service', () => {
  describe('In-memory provider service set', () => {
    let inMemoryProviderService: InMemoryProviderService;
    let distributedLockService: DistributedLockService;

    beforeEach(() => {
      inMemoryProviderService = new InMemoryProviderService();
      distributedLockService = new DistributedLockService(inMemoryProviderService);
    });

    describe('Set up', () => {
      it('should have made a connection to the unique instance implemented', async () => {
        expect(distributedLockService.distributedLock).to.be.ok;
        expect(distributedLockService.instances.length).to.eql(1);

        const client = distributedLockService.instances[0];
        expect(await client!.ping()).to.eql('PONG');
        expect(client!.status).to.eql('ready');
        expect(client!.isCluster).to.eql(process.env.IN_MEMORY_CLUSTER_MODE_ENABLED === 'true');
      });

      it('should have default settings', () => {
        expect(distributedLockService.distributedLock.driftFactor).to.eql(0.01);
        expect(distributedLockService.distributedLock.retryCount).to.eql(50);
        expect(distributedLockService.distributedLock.retryDelay).to.eql(100);
        expect(distributedLockService.distributedLock.retryJitter).to.eql(200);
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
        expect(result).to.eql(false);
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
        expect(result).to.eql(true);
      });
    });

    describe('Functionalities', () => {
      it('should create lock and it should expire after the TTL set', async () => {
        const resource = 'lock-created';
        const TTL = 100;
        const handler = async () => setTimeout(500);

        distributedLockService.applyLock({ resource, ttl: TTL }, handler);

        const client = distributedLockService.instances[0];
        let resourceExists = await client!.exists(resource);
        expect(resourceExists).to.eql(1);
        // TTL + this time should be less than the handler set one to see that the self expiration works
        await setTimeout(TTL + 10);
        resourceExists = await client!.exists(resource);
        expect(resourceExists).to.eql(0);

        expect(spyLock.calledOnceWith([resource], TTL)).to.eq(true);
        expect(spyIncreaseLockCounter.calledOnce).to.eql(true);
        expect(spyDecreaseLockCounter.callCount).to.eql(0);
        // Unlock shouldn't be called as the lock expires by going over TTL
        expect(spyUnlock.called).to.eq(false);
      });

      it('should create lock and it should expire if the handler throws', async () => {
        const client = distributedLockService.instances[0];

        const resource = 'lock-created-but-handler-throws';
        const TTL = 100;
        const handler = async () => {
          const resourceExists = await client!.exists(resource);
          expect(resourceExists).to.eql(1);

          throw new Error();
        };

        try {
          const result = await distributedLockService.applyLock({ resource, ttl: TTL }, handler);
          expect(result).to.not.be;
        } catch {
          const resourceExists = await client!.exists(resource);
          expect(resourceExists).to.eql(0);
        }

        expect(spyLock.calledOnceWith([resource], TTL)).to.eq(true);
        expect(spyIncreaseLockCounter.calledOnce).to.eql(true);
        expect(spyDecreaseLockCounter.calledOnce).to.eql(true);
        expect(spyUnlock.calledOnceWith()).to.eq(true);
      });

      it('should create a lock and process after any other sequential call while lock is enabled', async () => {
        const resource = 'lock-created-and-sequential-calls';
        const TTL = 500;
        let expectedResult: Record<string, boolean> = {
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

        expect(expectedResult).to.deep.eq({ firstCall: true, secondCall: true });
        expect(spyLock.callCount).to.eql(2);
        expect(spyLock.calledWithExactly([resource], TTL)).to.eq(true);
        expect(spyIncreaseLockCounter.callCount).to.eql(2);
        expect(spyIncreaseLockCounter.calledWithExactly(resource)).to.eql(true);
        expect(spyDecreaseLockCounter.callCount).to.eql(2);
        expect(spyDecreaseLockCounter.calledWithExactly(resource)).to.eql(true);
        expect(spyUnlock.callCount).to.eql(2);
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

        await Promise.all([action(call), action(call), action(call), action(call), action(call)]);

        expect(executed).to.eql(1);
        expect(spyLock.callCount).to.eql(5);
        expect(spyLock.calledWithExactly([resource], TTL)).to.eq(true);
        expect(spyIncreaseLockCounter.callCount).to.eql(5);
        expect(spyIncreaseLockCounter.calledWithExactly(resource)).to.eql(true);
        expect(spyUnlock.callCount).to.greaterThanOrEqual(5);
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

        expect(executed).to.eql(5);
        expect(spyLock.callCount).to.eql(5);
        expect(spyLock.calledWithExactly([resource], TTL)).to.eq(true);
        expect(spyIncreaseLockCounter.callCount).to.eql(5);
        expect(spyIncreaseLockCounter.calledWithExactly(resource)).to.eql(true);
        expect(spyUnlock.callCount).to.greaterThanOrEqual(5);
      });
    });
  });

  describe('Bypass - In-memory provider service not set', () => {
    let inMemoryProviderService: InMemoryProviderService;
    let distributedLockService: DistributedLockService;

    beforeEach(() => {
      process.env.REDIS_CACHE_SERVICE_HOST = '';
      process.env.REDIS_CACHE_SERVICE_PORT = '0';
      process.env.REDIS_CLUSTER_SERVICE_HOST = '';
      process.env.REDIS_CLUSTER_SERVICE_PORTS = '';

      inMemoryProviderService = new InMemoryProviderService();
      expect(inMemoryProviderService.inMemoryProviderConfig.host).to.eql('');
      distributedLockService = new DistributedLockService(inMemoryProviderService);
    });

    afterEach(() => {
      process.env.REDIS_CACHE_SERVICE_HOST = originalRedisCacheServiceHost;
      process.env.REDIS_CACHE_SERVICE_PORT = originalRedisCacheServicePort;
      process.env.REDIS_CLUSTER_SERVICE_HOST = originalRedisClusterServiceHost;
      process.env.REDIS_CLUSTER_SERVICE_PORTS = originalRedisClusterServicePorts;
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

        const result = await distributedLockService.applyLock({ resource, ttl: TTL }, handler);
        expect(result).to.deep.equal({ executed: true });

        expect(spyLock.calledOnceWith([resource], TTL)).to.eq(false);
        expect(spyIncreaseLockCounter.calledOnce).to.eql(false);
        expect(spyDecreaseLockCounter.callCount).to.eql(0);
        expect(spyUnlock.called).to.eq(false);
      });
    });
  });
});

import Redis from 'ioredis';
import * as Redlock from 'redlock';
import { setTimeout } from 'timers/promises';
import { Logger } from '@nestjs/common';

import { ApiException } from '../../exceptions/api.exception';

const shouldLog = process.env.FF_IS_DISTRIBUTED_LOCK_LOGGING_ENABLED === 'true';

const LOG_CONTEXT = 'DistributedLock';

const getRedisUrl = () => {
  if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
    throw new ApiException(
      'Missing needed environment variables for Redis instance configuration for the distributed lock service'
    );
  }

  return `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
};

interface ILockOptions {
  resource: string;
  ttl: number;
}

export class DistributedLockService {
  public distributedLock: Redlock;
  public instances: Redis[];
  public lockCounter = {};
  public shuttingDown = false;

  constructor() {
    this.startup();
  }

  public startup(
    settings = {
      driftFactor: 0.01,
      retryCount: 50,
      retryDelay: 100,
      retryJitter: 200,
    }
  ): void {
    if (this.distributedLock) {
      return;
    }

    // TODO: Implement distributed nodes (at least 3 Redis instances)
    this.instances = [getRedisUrl()].filter((instance) => !!instance).map((url) => new Redis(url));

    this.distributedLock = new Redlock(this.instances, settings);
    Logger.log('Redlock started', LOG_CONTEXT);

    /**
     * https://github.com/mike-marcacci/node-redlock/blob/dc7bcd923f70f66abc325d23ae618f7caf01ad75/src/index.ts#L192
     *
     * Because Redlock is designed for high availability, it does not care if
     * a minority of redis instances/clusters fail at an operation.
     *
     * However, it can be helpful to monitor and log such cases. Redlock emits
     * an "error" event whenever it encounters an error, even if the error is
     * ignored in its normal operation.
     *
     * This function serves to prevent Node's default behavior of crashing
     * when an "error" event is emitted in the absence of listeners.
     */
    this.distributedLock.on('error', (error) => {
      // Log all other errors.
      Logger.error(error, LOG_CONTEXT);
    });
  }

  public areAllLocksReleased(): boolean {
    return Object.values(this.lockCounter).every((value) => !value);
  }

  public async shutdown(): Promise<void> {
    if (this.distributedLock) {
      while (!this.areAllLocksReleased()) {
        await setTimeout(250);
      }

      if (!this.shuttingDown) {
        try {
          Logger.log('Redlock starting to shut down', LOG_CONTEXT);
          this.shuttingDown = true;
          await this.distributedLock.quit();
        } catch (error) {
          Logger.error(`Error quiting redlock: ${error.message}`, LOG_CONTEXT);
        } finally {
          this.shuttingDown = false;
          this.distributedLock = undefined;
          Logger.log('Redlock shutdown', LOG_CONTEXT);
        }
      }
    }
  }

  /**
   * This Nest.js hook allows us to execute logic on termination after signal.
   * https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown
   *
   * Enabled by:
   *   app.enableShutdownHooks();
   *
   * in /apps/api/src/bootstrap.ts
   */
  public async onApplicationShutdown(signal): Promise<void> {
    await this.shutdown();
  }

  public async applyLock<T>({ resource, ttl }: ILockOptions, handler: () => Promise<T>): Promise<T> {
    const releaseLock = await this.lock(resource, ttl);

    try {
      shouldLog && Logger.log(`Lock ${resource} for ${handler.name}`, LOG_CONTEXT);

      const result = await handler();

      return result;
    } finally {
      await releaseLock();
      shouldLog && Logger.log(`Lock ${resource} released for ${handler.name}`, LOG_CONTEXT);
    }
  }

  private async lock(resource: string, ttl: number): Promise<() => Promise<void>> {
    if (!this.distributedLock) {
      shouldLog &&
        Logger.log(`Redlock was not started. Starting after calling lock ${resource} for ${ttl} ms`, LOG_CONTEXT);
      this.startup();
    }

    try {
      const acquiredLock = await this.distributedLock.acquire([resource], ttl);
      shouldLog && Logger.log(`Lock ${resource} acquired for ${ttl} ms`, LOG_CONTEXT);

      return this.createLockRelease(resource, acquiredLock);
    } catch (error) {
      shouldLog && Logger.error(`Lock ${resource} threw an error: ${error.message}`, LOG_CONTEXT);
      throw error;
    }
  }

  private createLockRelease(resource: string, lock): () => Promise<void> {
    this.increaseLockCounter(resource);

    return async (): Promise<void> => {
      try {
        shouldLog && Logger.debug(`Lock ${resource} counter at ${this.lockCounter[resource]}`, LOG_CONTEXT);
        await lock.unlock();
      } catch (error) {
        shouldLog && Logger.error(`Releasing lock ${resource} threw an error: ${error.message}`, LOG_CONTEXT);
      } finally {
        this.decreaseLockCounter(resource);
      }
    };
  }

  private increaseLockCounter(resource: string): void {
    if (this.lockCounter[resource]) {
      this.lockCounter[resource]++;

      return;
    }
    this.lockCounter[resource] = 1;
  }

  private decreaseLockCounter(resource: string): void {
    this.lockCounter[resource]--;
  }
}

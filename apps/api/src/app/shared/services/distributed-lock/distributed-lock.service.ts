import Redis from 'ioredis';
import * as Redlock from 'redlock';
import { setTimeout } from 'timers/promises';
import { Logger } from '@nestjs/common';

const LOG_CONTEXT = 'DistributedLock';

const redisUrl =
  process.env.REDIS_HOST && process.env.REDIS_PORT
    ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    : 'localhost:6379';

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
    this.instances = [redisUrl].filter((instance) => !!instance).map((url) => new Redis(url));

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

  public async shutdown(): Promise<void> {
    const timeout = async () => setTimeout(250);

    if (this.distributedLock) {
      while (this.lockCounter > 0) {
        await timeout();
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

  public async applyLock<T>({ resource, ttl }: ILockOptions, handler: () => Promise<T>): Promise<T> {
    const releaseLock = await this.lock(resource, ttl);

    try {
      Logger.log(`Lock ${resource} for ${handler.name}`, LOG_CONTEXT);

      const result = await handler();

      return result;
    } finally {
      await releaseLock();
      Logger.log(`Lock ${resource} released for ${handler.name}`, LOG_CONTEXT);
    }
  }

  private async lock(resource: string, ttl: number): Promise<() => Promise<void>> {
    if (!this.distributedLock) {
      Logger.log(`Redlock was not started. Starting after calling lock ${resource} for ${ttl} ms`, LOG_CONTEXT);
      this.startup();
    }

    try {
      const acquiredLock = await this.distributedLock.acquire([resource], ttl);
      Logger.log(`Lock ${resource} acquired for ${ttl} ms`, LOG_CONTEXT);

      return this.createLockRelease(resource, acquiredLock);
    } catch (error) {
      Logger.error(`Lock ${resource} threw an error: ${error.message}`, LOG_CONTEXT);
      throw error;
    }
  }

  private createLockRelease(resource: string, lock): () => Promise<void> {
    this.increaseLockCounter(resource);

    return async (): Promise<void> => {
      try {
        // TODO: Hide or move to trace.
        Logger.debug(`Lock ${resource} counter at ${this.lockCounter[resource]}`, LOG_CONTEXT);
        await lock.unlock();
      } catch (error) {
        Logger.error(`Releasing lock ${resource} threw an error: ${error.message}`, LOG_CONTEXT);
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

import Redis from 'ioredis';
import Redlock, { Lock, ResourceLockedError, Settings } from 'redlock';
import { Logger } from '@nestjs/common';

const LOG_CONTEXT = 'DistributedLock';

const redisUrl = `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` || 'localhost:6379';

interface ILockOptions {
  resource: string;
  ttl: number;
}

let distributedLock: Redlock;
let lockCounter = 0;

export const startup = (
  settings: Settings = {
    automaticExtensionThreshold: 500,
    driftFactor: 0.01,
    retryCount: 50,
    retryDelay: 100,
    retryJitter: 200,
  }
): void => {
  if (distributedLock) {
    return;
  }

  // TODO: Implement distributed nodes (at least 3 Redis instances)
  const rawInstances = [redisUrl].filter((instance) => !!instance).map((url) => new Redis(url));

  distributedLock = new Redlock(rawInstances, settings);
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
  distributedLock.on('error', (error) => {
    // Ignore cases where a resource is explicitly marked as locked on a client.
    if (error instanceof ResourceLockedError) {
      // TODO: Hide or move to trace.
      Logger.error(error, LOG_CONTEXT);

      return;
    }

    // Log all other errors.
    Logger.error(error, LOG_CONTEXT);
  });
};

let shuttingDown = false;
export const shutdown = async (): Promise<void> => {
  const timeout = async () => new Promise((resolve) => setTimeout(resolve, 250));

  if (distributedLock) {
    while (lockCounter > 0) {
      await timeout();
    }

    if (!shuttingDown) {
      try {
        Logger.log('Redlock starting to shut down', LOG_CONTEXT);
        shuttingDown = true;
        await distributedLock.quit();
      } catch (error) {
        Logger.error(`Error quiting redlock: ${error.message}`, LOG_CONTEXT);
      } finally {
        shuttingDown = false;
        distributedLock = undefined;
        Logger.log('Redlock shutdown', LOG_CONTEXT);
      }
    }
  }
};

const createLockRelease = (lock: Lock) => {
  lockCounter++;

  return async (): Promise<void> => {
    try {
      // TODO: Hide or move to trace.
      Logger.debug(`Lock ${lock.value} counter at ${lockCounter}`, LOG_CONTEXT);
      await lock.release();
    } catch (error) {
      Logger.error(`Releasing lock ${lock.value} threw an error: ${error.message}`, LOG_CONTEXT);
      throw error;
    } finally {
      lockCounter--;
    }
  };
};

const lock = async (resource: string, ttl: number): Promise<() => Promise<void>> => {
  if (!distributedLock) {
    Logger.log(`Redlock was not started. Starting after calling lock ${resource} for ${ttl} ms`, LOG_CONTEXT);
    startup();
  }

  try {
    const acquiredLock = await distributedLock.acquire([resource], ttl);
    Logger.log(`Lock ${resource} acquired for ${ttl} ms`, LOG_CONTEXT);

    return createLockRelease(acquiredLock);
  } catch (error) {
    Logger.error(`Lock ${resource} threw an error: ${error.message}`, LOG_CONTEXT);
    throw error;
  }
};

export const applyLock = async <T>({ resource, ttl }: ILockOptions, handler: () => Promise<T>): Promise<T> => {
  const releaseLock = await lock(resource, ttl);

  try {
    Logger.log(`Lock ${resource} for ${handler.name}`, LOG_CONTEXT);

    const result = await handler();

    return result;
  } finally {
    await releaseLock();
    Logger.log(`Lock ${resource} released for ${handler.name}`, LOG_CONTEXT);
  }
};

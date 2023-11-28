import Redlock from 'redlock';
import { setTimeout } from 'timers/promises';
import { Injectable, Logger } from '@nestjs/common';

import {
  InMemoryProviderClient,
  CacheInMemoryProviderService,
} from '../in-memory-provider';

const LOG_CONTEXT = 'DistributedLock';

export interface ILockOptions {
  resource: string;
  ttl: number;
}

@Injectable()
export class DistributedLockService {
  public distributedLock: Redlock;
  public instances: InMemoryProviderClient[];
  public lockCounter = {};
  public shuttingDown = false;

  constructor(
    private cacheInMemoryProviderService: CacheInMemoryProviderService
  ) {}

  async initialize(): Promise<void> {
    await this.cacheInMemoryProviderService.initialize();
    this.startup(this.cacheInMemoryProviderService.getClient());
  }

  public startup(
    client: InMemoryProviderClient,
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

    if (client) {
      this.instances = [client];
      this.distributedLock = new Redlock(this.instances, settings);
      Logger.verbose('Redlock started', LOG_CONTEXT);

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
        Logger.error(
          error,
          'There has been an error in the Distributed Lock service',
          LOG_CONTEXT
        );
      });
    }
  }

  public isDistributedLockEnabled(): boolean {
    if (!this.distributedLock) {
      Logger.log('Distributed lock service is not enabled', LOG_CONTEXT);

      return false;
    } else {
      return true;
    }
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
          Logger.verbose('Redlock starting to shut down', LOG_CONTEXT);
          this.shuttingDown = true;
          await this.distributedLock.quit();
        } catch (error: any) {
          Logger.verbose(
            `Error quiting redlock: ${error.message}`,
            LOG_CONTEXT
          );
        } finally {
          this.shuttingDown = false;
          this.distributedLock = undefined;
          await this.cacheInMemoryProviderService.shutdown();
          Logger.verbose('Redlock shutdown', LOG_CONTEXT);
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

  /*
   * This method checks if a resource contains environmentId in the key
   * and build a Redis prefix `{prefix}resource-key` that helps to
   * automatically shard through the different nodes in Cluster mode
   * No sharding will be done if the key is not found.
   *
   * Reference: https://redis.io/docs/reference/cluster-spec/ (`Hash tags` entry)
   */
  public buildResourceWithPrefix(resource: string): string {
    const resourceParts = resource.split(':');
    const environmentResourceIndex = resourceParts.findIndex(
      (el) => el === 'environment'
    );

    if (environmentResourceIndex === -1) {
      return resource;
    }

    const environmentId = resourceParts[environmentResourceIndex + 1];

    return `{environmentId:${environmentId}}${resource}`;
  }

  public async applyLock<T>(
    { resource, ttl }: ILockOptions,
    handler: () => Promise<T>
  ): Promise<T> {
    if (!this.isDistributedLockEnabled()) {
      return await handler();
    }

    /**
     * Add prefix to allow autopipelining functionality of ioredis
     * We add it here instead where the resource name creation is as this is the single entry point
     * and all the DistributedLock functionalities take the value from here.
     */
    const resourceWithPrefix = this.buildResourceWithPrefix(resource);

    const releaseLock = await this.lock(resourceWithPrefix, ttl);

    try {
      Logger.debug(
        `Lock ${resourceWithPrefix} for ${handler.name}`,
        LOG_CONTEXT
      );

      const result = await handler();

      return result;
    } finally {
      await releaseLock();
      Logger.debug(
        `Lock ${resourceWithPrefix} released for ${handler.name}`,
        LOG_CONTEXT
      );
    }
  }

  private async lock(
    resource: string,
    ttl: number
  ): Promise<() => Promise<void>> {
    try {
      const acquiredLock = await this.distributedLock.acquire([resource], ttl);
      Logger.verbose(`Lock ${resource} acquired for ${ttl} ms`, LOG_CONTEXT);

      return this.createLockRelease(resource, acquiredLock);
    } catch (error: any) {
      Logger.verbose(
        `Lock ${resource} threw an error: ${error.message}`,
        LOG_CONTEXT
      );
      throw error;
    }
  }

  private createLockRelease(resource: string, lock): () => Promise<void> {
    this.increaseLockCounter(resource);

    return async (): Promise<void> => {
      try {
        Logger.debug(
          `Lock ${resource} counter at ${this.lockCounter[resource]}`,
          LOG_CONTEXT
        );
        await lock.unlock();
      } catch (error: any) {
        Logger.error(
          `Releasing lock ${resource} threw an error: ${error.message}`,
          LOG_CONTEXT
        );
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

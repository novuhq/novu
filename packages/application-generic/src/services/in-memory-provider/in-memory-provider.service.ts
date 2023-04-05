import { Logger } from '@nestjs/common';

import {
  CLIENT_READY,
  getRedisInstance,
  getRedisProviderConfig,
  IRedisProviderConfig,
  Redis,
} from './redis-provider';

const LOG_CONTEXT = 'InMemoryCluster';

export type InMemoryProviderClient = Redis | undefined;
type InMemoryProviderConfig = IRedisProviderConfig;

export class InMemoryProviderService {
  public inMemoryProviderClient: InMemoryProviderClient;
  public inMemoryProviderConfig: InMemoryProviderConfig;

  constructor() {
    if (!this.inMemoryProviderClient) {
      this.inMemoryProviderClient = process.env.IN_MEMORY_CLUSTER_MODE_ENABLED
        ? this.inMemoryClusterProviderSetup()
        : this.inMemoryProviderSetup();
    }
  }

  public isClientReady(): boolean {
    if (!this.inMemoryProviderClient) {
      return false;
    }

    return this.inMemoryProviderClient.status === CLIENT_READY;
  }

  private inMemoryClusterProviderSetup(): InMemoryProviderClient {
    Logger.verbose('In-memory cluster service set up', LOG_CONTEXT);

    return {} as InMemoryProviderClient;
  }

  private inMemoryProviderSetup(): InMemoryProviderClient {
    Logger.verbose('In-memory service set up', LOG_CONTEXT);

    this.inMemoryProviderConfig = getRedisProviderConfig();
    const { host, port, ttl } = getRedisProviderConfig();

    if (!host) {
      Logger.log('Missing host for in-memory provider', LOG_CONTEXT);
    }

    if (host) {
      Logger.log(`Connecting to ${host}:${port}`, LOG_CONTEXT);

      const inMemoryProviderClient = getRedisInstance();

      inMemoryProviderClient.on('connect', () => {
        Logger.log('REDIS CONNECTED', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('error', (error) => {
        Logger.error(error, LOG_CONTEXT);
      });

      return inMemoryProviderClient;
    }
  }

  public async shutdown(): Promise<void> {
    if (this.inMemoryProviderClient) {
      Logger.verbose('In-memory cluster service shutdown', LOG_CONTEXT);
      await this.inMemoryProviderClient.quit();
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
}

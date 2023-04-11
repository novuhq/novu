import { Injectable, Logger } from '@nestjs/common';

import {
  getElasticacheCluster,
  getElasticacheClusterProviderConfig,
  IElasticacheClusterProviderConfig,
} from './elasticache-cluster-provider';
import {
  CLIENT_READY,
  getRedisInstance,
  getRedisProviderConfig,
  IRedisProviderConfig,
  Redis,
  RedisOptions,
} from './redis-provider';
import {
  Cluster,
  ClusterOptions,
  getRedisCluster,
  getRedisClusterProviderConfig,
  IRedisClusterProviderConfig,
} from './redis-cluster-provider';

import { ApiException } from '../../exceptions/api.exception';

const LOG_CONTEXT = 'InMemoryCluster';

export type InMemoryProviderClient = Redis | Cluster | undefined;
type InMemoryProviderConfig = IElasticacheClusterProviderConfig | IRedisProviderConfig | IRedisClusterProviderConfig;

@Injectable()
export class InMemoryProviderService {
  public inMemoryProviderClient: InMemoryProviderClient;
  public inMemoryProviderConfig: InMemoryProviderConfig;

  constructor() {
    this.inMemoryProviderClient = this.buildClient();
  }

  private buildClient(): Redis | Cluster | undefined {
    return this.isClusterMode() ? this.inMemoryClusterProviderSetup() : this.inMemoryProviderSetup();
  }

  public isClientReady(): boolean {
    if (!this.inMemoryProviderClient) {
      return false;
    }

    // TODO: Check this works for Cluster
    return this.inMemoryProviderClient.status === CLIENT_READY;
  }

  public isClusterMode(): boolean {
    return process.env.IN_MEMORY_CLUSTER_MODE_ENABLED === 'true';
  }

  public getClusterOptions(): ClusterOptions | undefined {
    if (this.inMemoryProviderClient && this.isClusterMode()) {
      return this.inMemoryProviderClient.options;
    }
  }

  public getOptions(): RedisOptions | undefined {
    if (this.inMemoryProviderClient) {
      if (this.isClusterMode()) {
        const clusterOptions: ClusterOptions = this.inMemoryProviderClient.options;

        return clusterOptions.redisOptions;
      } else {
        const options: RedisOptions = this.inMemoryProviderClient.options;

        return options;
      }
    }
  }

  private isElasticacheEnabled(): boolean {
    return !!process.env.ELASTICACHE_CLUSTER_SERVICE_HOST && !!process.env.ELASTICACHE_CLUSTER_SERVICE_PORT;
  }

  private getClientAndConfigForCluster(): {
    getClient: () => Cluster | undefined;
    getConfig: () => InMemoryProviderConfig;
  } {
    const clusterProviders = {
      elasticache: {
        getClient: getElasticacheCluster,
        getConfig: getElasticacheClusterProviderConfig,
      },
      redis: {
        getClient: getRedisCluster,
        getConfig: getRedisClusterProviderConfig,
      },
    };

    return this.isElasticacheEnabled() ? clusterProviders.elasticache : clusterProviders.redis;
  }

  private inMemoryClusterProviderSetup(): Cluster | undefined {
    Logger.verbose('In-memory cluster service set up', LOG_CONTEXT);

    const { getConfig, getClient } = this.getClientAndConfigForCluster();

    this.inMemoryProviderConfig = getConfig();
    const { host, ttl } = getConfig();

    if (!host) {
      Logger.warn('Missing host for in-memory cluster provider', LOG_CONTEXT);
    }

    const inMemoryProviderClient = getClient();
    if (host && inMemoryProviderClient) {
      Logger.log(`Connecting to cluster at ${host}`, LOG_CONTEXT);

      inMemoryProviderClient.on('connect', () => {
        Logger.log('In-memory cluster connected', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('connecting', () => {
        Logger.log('In-memory cluster connecting', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('reconnecting', () => {
        Logger.log('In-memory cluster reconnecting', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('close', () => {
        Logger.warn('In-memory cluster close', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('end', () => {
        Logger.warn('In-memory cluster end', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('error', (error) => {
        Logger.error(error, LOG_CONTEXT);
      });

      inMemoryProviderClient.on('ready', () => {
        Logger.log('In-memory cluster ready', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('wait', () => {
        Logger.log('In-memory cluster wait', LOG_CONTEXT);
      });

      return inMemoryProviderClient;
    }
  }

  private inMemoryProviderSetup(): Redis | undefined {
    Logger.verbose('In-memory service set up', LOG_CONTEXT);

    this.inMemoryProviderConfig = getRedisProviderConfig();
    const { host, port, ttl } = getRedisProviderConfig();

    if (!host) {
      Logger.log('Missing host for in-memory provider', LOG_CONTEXT);
    }

    const inMemoryProviderClient = getRedisInstance();
    if (host && inMemoryProviderClient) {
      Logger.log(`Connecting to ${host}:${port}`, LOG_CONTEXT);

      inMemoryProviderClient.on('connect', () => {
        Logger.log('REDIS CONNECTED', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('reconnecting', () => {
        Logger.log('Redis reconnecting', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('close', () => {
        Logger.warn('Redis close', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('end', () => {
        Logger.warn('Redis end', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('error', (error) => {
        Logger.error(error, LOG_CONTEXT);
      });

      inMemoryProviderClient.on('ready', () => {
        Logger.log('Redis ready', LOG_CONTEXT);
      });

      inMemoryProviderClient.on('wait', () => {
        Logger.log('Redis wait', LOG_CONTEXT);
      });

      return inMemoryProviderClient;
    }
  }

  public inMemoryScan(pattern: string) {
    if (this.isClusterMode()) {
      const client = this.inMemoryProviderClient as Cluster;

      return client.sscanStream(pattern);
    }

    const client = this.inMemoryProviderClient as Redis;

    return client.scanStream({ match: pattern });
  }

  public async shutdown(): Promise<void> {
    if (this.inMemoryProviderClient) {
      Logger.verbose('In-memory provider service shutdown', LOG_CONTEXT);
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

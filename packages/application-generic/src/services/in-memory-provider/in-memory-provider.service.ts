import { Injectable, Logger } from '@nestjs/common';
import { setTimeout } from 'timers/promises';

import {
  getElasticacheCluster,
  getElasticacheClusterProviderConfig,
  IElasticacheClusterProviderConfig,
  validateElasticacheClusterProviderConfig,
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
  ChainableCommander,
  Cluster,
  ClusterOptions,
  getRedisCluster,
  getRedisClusterProviderConfig,
  IRedisClusterProviderConfig,
  validateRedisClusterProviderConfig,
} from './redis-cluster-provider';
import { GetIsInMemoryClusterModeEnabled } from '../../usecases';
import { PlatformException } from '../../utils/exceptions';

const LOG_CONTEXT = 'InMemoryCluster';

export enum InMemoryProviderEnum {
  ELASTICACHE = 'Elasticache',
  MEMORY_DB = 'MemoryDB',
  REDIS = 'Redis',
}

export type InMemoryProviderClient = Redis | Cluster | undefined;
type InMemoryProviderConfig =
  | IElasticacheClusterProviderConfig
  | IRedisProviderConfig
  | IRedisClusterProviderConfig;
export type Pipeline = ChainableCommander;

@Injectable()
export class InMemoryProviderService {
  public inMemoryProviderClient: InMemoryProviderClient;
  public inMemoryProviderConfig: InMemoryProviderConfig;

  private nodesInterval;

  constructor(
    private getIsInMemoryClusterModeEnabled: GetIsInMemoryClusterModeEnabled,
    private provider: InMemoryProviderEnum,
    private enableAutoPipelining?: boolean
  ) {
    Logger.log('In-memory provider service initialized', LOG_CONTEXT);

    this.inMemoryProviderClient = this.buildClient(provider);
  }

  private buildClient(
    provider: InMemoryProviderEnum
  ): Redis | Cluster | undefined {
    const isClusterMode = this.isClusterMode();

    return isClusterMode
      ? this.inMemoryClusterProviderSetup(provider)
      : this.inMemoryProviderSetup();
  }

  public async delayUntilReadiness(): Promise<void> {
    let times = 0;
    const retries = process.env
      .IN_MEMORY_PROVIDER_SERVICE_READINESS_TIMEOUT_RETRIES
      ? Number(process.env.IN_MEMORY_PROVIDER_SERVICE_READINESS_TIMEOUT_RETRIES)
      : 10;
    const timeout = process.env.IN_MEMORY_PROVIDER_SERVICE_READINESS_TIMEOUT
      ? Number(process.env.IN_MEMORY_PROVIDER_SERVICE_READINESS_TIMEOUT)
      : 100;

    while (times < retries && !this.isClientReady()) {
      times += 1;
      await setTimeout(timeout);
    }

    Logger.log(
      `Delayed ${times} times up to a total of ${times * retries}`,
      LOG_CONTEXT
    );
  }

  public getStatus(): string | unknown {
    if (this.inMemoryProviderClient) {
      return this.inMemoryProviderClient.status;
    }
  }

  public isClientReady(): boolean {
    return this.getStatus() === CLIENT_READY;
  }

  public isClusterMode(): boolean {
    const isClusterModeEnabled = this.getIsInMemoryClusterModeEnabled.execute();
    Logger.log(
      `Cluster mode ${
        isClusterModeEnabled ? 'is' : 'is not'
      } enabled for InMemoryProviderService`
    );

    return isClusterModeEnabled;
  }

  public getClusterOptions(): ClusterOptions | undefined {
    const isClusterMode = this.isClusterMode();
    if (this.inMemoryProviderClient && isClusterMode) {
      return this.inMemoryProviderClient.options;
    }
  }

  public getOptions(): RedisOptions | undefined {
    if (this.inMemoryProviderClient) {
      if (this.isClusterMode()) {
        const clusterOptions: ClusterOptions =
          this.inMemoryProviderClient.options;

        return clusterOptions.redisOptions;
      } else {
        const options: RedisOptions = this.inMemoryProviderClient.options;

        return options;
      }
    }
  }

  public getClientAndConfigForCluster(providerId: InMemoryProviderEnum): {
    getClient: (enableAutoPipelining?: boolean) => Cluster | undefined;
    getConfig: () => InMemoryProviderConfig;
  } {
    const clusterProviders = {
      [InMemoryProviderEnum.ELASTICACHE]: {
        getClient: getElasticacheCluster,
        getConfig: getElasticacheClusterProviderConfig,
        validate: validateElasticacheClusterProviderConfig,
      },
      [InMemoryProviderEnum.REDIS]: {
        getClient: getRedisCluster,
        getConfig: getRedisClusterProviderConfig,
        validate: validateRedisClusterProviderConfig,
      },
    };

    const provider = clusterProviders[providerId];

    if (
      !provider ||
      !provider.validate() ||
      providerId === InMemoryProviderEnum.REDIS
    ) {
      const defaultProvider = clusterProviders[InMemoryProviderEnum.REDIS];
      if (!defaultProvider.validate()) {
        const message = `Provider ${providerId} is not properly configured in the environment variables`;
        Logger.error(message, LOG_CONTEXT);
        throw new PlatformException(message);
      }

      return defaultProvider;
    }

    return provider;
  }

  private inMemoryClusterProviderSetup(provider): Cluster | undefined {
    Logger.verbose(
      `In-memory cluster service set up for ${provider}`,
      LOG_CONTEXT
    );

    const { getConfig, getClient } =
      this.getClientAndConfigForCluster(provider);

    this.inMemoryProviderConfig = getConfig();
    const { host, ttl } = getConfig();

    if (!host) {
      Logger.warn(
        `Missing host for in-memory cluster for provider ${provider}`,
        LOG_CONTEXT
      );
    }

    const inMemoryProviderClient = getClient(this.enableAutoPipelining);
    if (host && inMemoryProviderClient) {
      Logger.log(`Connecting to cluster at ${host}`, LOG_CONTEXT);

      this.nodesInterval = setInterval(() => {
        try {
          inMemoryProviderClient.nodes('all')?.forEach((node) => {
            Logger.debug(
              {
                commandQueueLength: node.commandQueue?.length,
                host: node.options?.host,
              },
              `Node ${node.options?.host}:${node.options.port} commandQueue length is ${node.commandQueue.length}`,
              LOG_CONTEXT
            );
          });
        } catch (e) {
          Logger.error(
            'Connecting to cluster executing intervals has failed',
            e,
            LOG_CONTEXT
          );
        }
      }, 2000);

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
        Logger.error(
          'There has been an error in the InMemory Cluster provider client',
          error,
          LOG_CONTEXT
        );
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
        Logger.error(
          'There has been an error in the InMemory provider client',
          error,
          LOG_CONTEXT
        );
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
      clearInterval(this.nodesInterval);

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

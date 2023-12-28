import { Logger } from '@nestjs/common';

import { InMemoryProvider } from '../providers/in-memory-provider';
import { GetIsInMemoryClusterModeEnabled } from '../../../usecases';
import {
  InMemoryProviderClient,
  InMemoryProviderConfig,
  InMemoryProviderEnum,
  IProviderConfiguration,
  ScanStream,
} from '../shared/types';
import { RedisProvider } from '../providers/redis-provider';
import { RedisClusterProvider } from '../providers/redis-cluster-provider';
import { AzureCacheForRedisProvider } from '../providers/azure-cache-for-redis-cluster-provider';
import { ElastiCacheClusterProvider } from '../providers/elasticache-cluster-provider';
import { MemoryDbClusterProvider } from '../providers/memory-db-cluster-provider';
import {
  isClusterProvider,
  isInMemoryProvider,
} from '../shared/provider-utils';

export abstract class ProviderService {
  abstract LOG_CONTEXT;
  protected provider: InMemoryProvider;
  protected getIsInMemoryClusterModeEnabled: GetIsInMemoryClusterModeEnabled;
  protected providerId: InMemoryProviderEnum | null;

  constructor() {
    // todo - check if there a reason not inject this `get is cluster mode enabled`
    this.getIsInMemoryClusterModeEnabled =
      new GetIsInMemoryClusterModeEnabled();

    this.initializeProvider();
  }

  protected getConfigOptions(): IProviderConfiguration {
    /*
     *  Disabled in Prod as affects performance
     */
    const showFriendlyErrorStack = process.env.NODE_ENV !== 'production';

    return { options: { showFriendlyErrorStack } };
  }

  private initializeProvider(): void {
    this.clusterVerification();

    const config = this.getConfigOptions();

    if (isInMemoryProvider(config.envOptions?.providerId)) {
      this.providerId = config.envOptions?.providerId;
    }

    switch (this.providerId) {
      case InMemoryProviderEnum.REDIS: {
        this.provider = new RedisProvider(config);
        break;
      }
      case InMemoryProviderEnum.REDIS_CLUSTER: {
        this.provider = new RedisClusterProvider(config);
        break;
      }
      case InMemoryProviderEnum.AZURE_CACHE_FOR_REDIS: {
        this.provider = new AzureCacheForRedisProvider(config);
        break;
      }
      case InMemoryProviderEnum.ELASTI_CACHE: {
        this.provider = new ElastiCacheClusterProvider(config);
        break;
      }
      case InMemoryProviderEnum.MEMORY_DB: {
        this.provider = new MemoryDbClusterProvider(config);
        break;
      }
      default: {
        if (!process.env.IS_DOCKER_HOSTED) {
          throw new Error(
            'Provider was not selected, please make sure you set the CACHE_PROVIDER_ID env variable'
          );
        }

        // community edition - allow to fall back to single redis instance
        this.providerId = InMemoryProviderEnum.REDIS;

        this.provider = new RedisProvider(config);
      }
    }
  }

  private clusterVerification() {
    const isClusterModeEnabled = this.isClusterModeEnabled();

    if (isClusterProvider(this.providerId) && !isClusterModeEnabled) {
      throw new Error(
        `Tried to initialized cluster provider ${this.providerId} while cluster mode is not enabled.`
      );
    }
  }

  private isClusterModeEnabled(): boolean {
    const isClusterModeEnabled = this.getIsInMemoryClusterModeEnabled.execute();

    Logger.log(
      `Cluster mode ${isClusterModeEnabled ? 'IS' : 'IS NOT'} enabled for ${
        this.LOG_CONTEXT
      }`,
      this.LOG_CONTEXT
    );

    return isClusterModeEnabled;
  }

  public async initialize(): Promise<void> {
    await this.provider.delayUntilReadiness();
  }

  public getClientStatus(): string | unknown {
    return this.provider.getStatus();
  }

  public inMemoryScan(pattern: string): ScanStream {
    return this.provider.inMemoryScan(pattern);
  }

  public isReady(): boolean {
    return this.provider.isClientReady();
  }

  public runningInCluster(): boolean {
    return this.provider.isCluster;
  }

  public async shutdown(): Promise<void> {
    await this.provider.shutdown();
  }

  /*
   * This method was designed to send the instance to distributed lock & bull mq services during initialization.
   */
  getClient(): InMemoryProviderClient {
    return this.provider.getClient();
  }

  getConfig(): InMemoryProviderConfig {
    return this.provider.getConfig();
  }
}

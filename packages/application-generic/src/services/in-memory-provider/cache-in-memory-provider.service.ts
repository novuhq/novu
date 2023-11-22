import { Logger } from '@nestjs/common';

import { InMemoryProviderService } from './in-memory-provider.service';
import {
  getClusterProvider,
  getSingleInstanceProvider,
  IProviderCluster,
  IProviderRedis,
} from './providers';
import {
  InMemoryProviderEnum,
  InMemoryProviderClient,
  IProviderClusterConfigOptions,
  ScanStream,
} from './types';

import { GetIsInMemoryClusterModeEnabled } from '../../usecases';

const LOG_CONTEXT = 'CacheInMemoryProviderService';

export class CacheInMemoryProviderService {
  public inMemoryProviderService: InMemoryProviderService;
  public isCluster: boolean;
  private getIsInMemoryClusterModeEnabled: GetIsInMemoryClusterModeEnabled;
  private loadedProvider: IProviderCluster | IProviderRedis;

  constructor() {
    this.getIsInMemoryClusterModeEnabled =
      new GetIsInMemoryClusterModeEnabled();
    this.isCluster = this.isClusterMode();

    this.loadedProvider = this.selectProvider();

    this.inMemoryProviderService = new InMemoryProviderService(
      this.loadedProvider,
      this.loadedProvider.getConfig(this.getCacheConfigOptions()),
      this.isCluster
    );
  }

  private getCacheConfigOptions(): IProviderClusterConfigOptions {
    const enableAutoPipelining =
      process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';
    /*
     *  Disabled in Prod as affects performance
     */
    const showFriendlyErrorStack = process.env.NODE_ENV !== 'production';

    return {
      enableAutoPipelining,
      showFriendlyErrorStack,
    };
  }

  /**
   * Rules for the provider selection:
   * - For our self hosted users we assume all of them have a single node Redis
   * instance. Only if they have set up the Cluster mode and the right config
   * will execute a different provider.
   * - For Novu we will use Elasticache. We fallback to a Redis Cluster configuration
   * if Elasticache not configured properly. If Redis Cluster is wrong too, we will
   * fall back to Redis single instance.
   */
  private selectProvider(): IProviderCluster | IProviderRedis {
    if (this.isClusterMode()) {
      const providerIds = [
        InMemoryProviderEnum.ELASTICACHE,
        InMemoryProviderEnum.REDIS_CLUSTER,
      ];

      let selectedProvider = undefined;
      for (const providerId of providerIds) {
        const clusterProvider = getClusterProvider(providerId);
        const clusterProviderConfig = clusterProvider.getConfig(
          this.getCacheConfigOptions()
        );

        if (clusterProvider.validate(clusterProviderConfig)) {
          selectedProvider = clusterProvider;
          break;
        }
      }

      if (selectedProvider) {
        return selectedProvider;
      }
    }

    return getSingleInstanceProvider();
  }

  private isClusterMode(): boolean {
    const isClusterModeEnabled = this.getIsInMemoryClusterModeEnabled.execute();

    Logger.log(
      `Cluster mode ${
        isClusterModeEnabled ? 'IS' : 'IS NOT'
      } enabled for ${LOG_CONTEXT}`,
      LOG_CONTEXT
    );

    return isClusterModeEnabled;
  }

  public async initialize(): Promise<void> {
    await this.inMemoryProviderService.delayUntilReadiness();
  }

  public getClient(): InMemoryProviderClient {
    return this.inMemoryProviderService.inMemoryProviderClient;
  }

  public getClientStatus(): string {
    return this.getClient().status;
  }

  public getTtl(): number {
    return this.inMemoryProviderService.inMemoryProviderConfig.ttl;
  }

  public inMemoryScan(pattern: string): ScanStream {
    return this.inMemoryProviderService.inMemoryScan(pattern);
  }

  public isReady(): boolean {
    return this.inMemoryProviderService.isClientReady();
  }

  public providerInUseIsInClusterMode(): boolean {
    return this.loadedProvider.provider !== InMemoryProviderEnum.REDIS;
  }

  public async shutdown(): Promise<void> {
    await this.inMemoryProviderService.shutdown();
  }
}

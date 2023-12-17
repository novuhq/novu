import { Logger } from '@nestjs/common';

import { InMemoryProviderService } from './in-memory-provider.service';
import {
  InMemoryProviderEnum,
  InMemoryProviderClient,
  ScanStream,
  IProviderClusterConfigOptions,
} from './types';

import { GetIsInMemoryClusterModeEnabled } from '../../usecases';
import {
  getClusterProvider,
  getSingleInstanceProvider,
  IProviderCluster,
  IProviderRedis,
} from './providers';

const LOG_CONTEXT = 'WebSocketsInMemoryProviderService';

export class WebSocketsInMemoryProviderService {
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

  private getCacheConfigOptions(): IProviderClusterConfigOptions {
    /*
     *  Disabled in Prod as affects performance
     */
    const showFriendlyErrorStack = process.env.NODE_ENV !== 'production';

    return {
      enableAutoPipelining: false,
      showFriendlyErrorStack,
    };
  }

  public providerInUseIsInClusterMode(): boolean {
    return this.loadedProvider.provider !== InMemoryProviderEnum.REDIS;
  }

  public async shutdown(): Promise<void> {
    await this.inMemoryProviderService.shutdown();
  }
}

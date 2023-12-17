import { Logger } from '@nestjs/common';

import { isProviderAllowed } from '../providers';
import {
  InMemoryProviderEnum,
  IProviderClusterConfigOptions,
  ScanStream,
} from '../shared/types';

import { GetIsInMemoryClusterModeEnabled } from '../../../usecases';
import { RedisProvider } from '../providers/redis-provider';
import { InMemoryProvider } from '../providers/in-memory-provider';
import { isClusterProvider } from '../providers/providers';
import { RedisClusterProvider } from '../providers/redis-cluster-provider';

const LOG_CONTEXT = 'CacheInMemoryProviderService';

export class CacheInMemoryProviderService {
  public provider: InMemoryProvider;
  private getIsInMemoryClusterModeEnabled: GetIsInMemoryClusterModeEnabled;
  private providerId: InMemoryProviderEnum | null;

  constructor() {
    // todo - check if there a reason not inject this `get is cluster mode enabled`
    this.getIsInMemoryClusterModeEnabled =
      new GetIsInMemoryClusterModeEnabled();
    this.setProviderId();

    this.initializeProvider();
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
   * New way of selecting provider with priority to select through environment variables
   * and fallback to the previous way retro compatible
   */
  private initializeProvider(): void {
    const isClusterModeEnabled = this.isClusterModeEnabled();

    if (isClusterProvider(this.providerId) && !isClusterModeEnabled) {
      throw new Error('Cluster mode is not enabled.');
    }

    switch (this.providerId) {
      case InMemoryProviderEnum.REDIS: {
        this.provider = new RedisProvider({
          options: this.getCacheConfigOptions(),
        });
        break;
      }
      case InMemoryProviderEnum.REDIS_CLUSTER: {
        this.provider = new RedisClusterProvider({
          options: this.getCacheConfigOptions(),
        });
        break;
      }
      default: {
        if (!process.env.IS_DOCKER_HOSTED) {
          throw new Error('Provider was not selected.');
        }

        // fallback to single redis instance
        this.providerId = InMemoryProviderEnum.REDIS;

        this.provider = new RedisProvider({
          options: this.getCacheConfigOptions(),
        });
      }
    }
  }

  setProviderId(providerId?: InMemoryProviderEnum) {
    const clientProviderId = providerId;

    if (clientProviderId) {
      this.providerId = clientProviderId;

      return;
    }

    this.providerId = this.processProviderId(process.env.CACHE_PROVIDER_ID);
  }

  private processProviderId(providerId: string): InMemoryProviderEnum | null {
    if (!providerId) {
      return null;
    }

    if (isProviderAllowed(providerId)) {
      return providerId as InMemoryProviderEnum;
    }

    return null;
  }

  private isClusterModeEnabled(): boolean {
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
}

import { Logger } from '@nestjs/common';

import { InMemoryProviderService } from './in-memory-provider.service';
import {
  InMemoryProviderEnum,
  InMemoryProviderClient,
  ScanStream,
} from './types';

import { GetIsInMemoryClusterModeEnabled } from '../../usecases';

const LOG_CONTEXT = 'CacheInMemoryProviderService';

export class CacheInMemoryProviderService {
  public inMemoryProviderService: InMemoryProviderService;
  public isCluster: boolean;
  private getIsInMemoryClusterModeEnabled: GetIsInMemoryClusterModeEnabled;

  constructor() {
    this.getIsInMemoryClusterModeEnabled =
      new GetIsInMemoryClusterModeEnabled();

    const provider = this.selectProvider();
    this.isCluster = this.isClusterMode();

    const enableAutoPipelining =
      process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';

    this.inMemoryProviderService = new InMemoryProviderService(
      provider,
      this.isCluster,
      enableAutoPipelining
    );
  }

  /**
   * Rules for the provider selection:
   * - For our self hosted users we assume all of them have a single node Redis
   * instance.
   * - For Novu we will use Elasticache. We fallback to a Redis Cluster configuration
   * if Elasticache not configured properly. That's happening in the provider
   * mapping in the /in-memory-provider/providers/index.ts
   */
  private selectProvider(): InMemoryProviderEnum {
    if (process.env.IS_DOCKER_HOSTED) {
      return InMemoryProviderEnum.REDIS;
    }

    return InMemoryProviderEnum.ELASTICACHE;
  }

  private descriptiveLogMessage(message) {
    return `[Provider: ${this.selectProvider()}] ${message}`;
  }

  private isClusterMode(): boolean {
    const isClusterModeEnabled = this.getIsInMemoryClusterModeEnabled.execute();

    Logger.log(
      this.descriptiveLogMessage(
        `Cluster mode ${
          isClusterModeEnabled ? 'IS' : 'IS NOT'
        } enabled for ${LOG_CONTEXT}`
      ),
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
    const providerConfigured =
      this.inMemoryProviderService.getProvider.configured;

    return this.isCluster || providerConfigured !== InMemoryProviderEnum.REDIS;
  }

  public async shutdown(): Promise<void> {
    await this.inMemoryProviderService.shutdown();
  }
}

import { Logger } from '@nestjs/common';
import { InMemoryProviderService } from './in-memory-provider.service';
import { InMemoryProviderClient, InMemoryProviderEnum, ScanStream } from './types';
import { isClusterModeEnabled } from './utils';

const LOG_CONTEXT = 'CacheInMemoryProviderService';

export class CacheInMemoryProviderService {
  public inMemoryProviderService: InMemoryProviderService;
  public isCluster: boolean;

  constructor() {
    const provider = this.selectProvider();
    this.isCluster = this.isClusterMode();

    const enableAutoPipelining = process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';

    this.inMemoryProviderService = new InMemoryProviderService(provider, this.isCluster, enableAutoPipelining);
  }

  /**
   * Rules for the provider selection:
   * - For self hosted non-enterprise users we use a single node Redis instance.
   * - For self hosted enterprise users we use Redis Master-Slave architecture by default,
   *   but allow using Elasticache when it is explicitly configured.
   * - For Novu cloud we use Elasticache. We fallback to a Redis Cluster configuration
   * if Elasticache not configured properly. That's happening in the provider
   * mapping in the /in-memory-provider/providers/index.ts
   */
  private selectProvider(): InMemoryProviderEnum {
    if (process.env.IS_SELF_HOSTED === 'true' && process.env.NOVU_ENTERPRISE === 'false') {
      return InMemoryProviderEnum.REDIS;
    }

    if (process.env.IS_SELF_HOSTED === 'true' && process.env.NOVU_ENTERPRISE === 'true') {
      if (process.env.ELASTICACHE_CLUSTER_SERVICE_HOST && process.env.ELASTICACHE_CLUSTER_SERVICE_PORT) {
        return InMemoryProviderEnum.ELASTICACHE;
      }

      return InMemoryProviderEnum.REDIS_MASTER_SLAVE;
    }

    return InMemoryProviderEnum.ELASTICACHE;
  }

  private descriptiveLogMessage(message) {
    return `[Provider: ${this.selectProvider()}] ${message}`;
  }

  private isClusterMode(): boolean {
    const isEnabled = isClusterModeEnabled();

    Logger.log(
      this.descriptiveLogMessage(`Cluster mode ${isEnabled ? 'IS' : 'IS NOT'} enabled for ${LOG_CONTEXT}`),
      LOG_CONTEXT
    );

    return isEnabled;
  }

  public async initialize(): Promise<void> {
    await this.inMemoryProviderService.delayUntilReadiness();
  }

  public getClient(): InMemoryProviderClient {
    return this.inMemoryProviderService.inMemoryProviderClient;
  }

  public getClientStatus(): string {
    return this.getClient()?.status || 'disconnected';
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
    const providerConfigured = this.inMemoryProviderService.getProvider.configured;

    return this.isCluster || providerConfigured !== InMemoryProviderEnum.REDIS;
  }

  public async shutdown(): Promise<void> {
    await this.inMemoryProviderService.shutdown();
  }
}

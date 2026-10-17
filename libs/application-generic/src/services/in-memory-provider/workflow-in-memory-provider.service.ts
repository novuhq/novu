import { Logger } from '@nestjs/common';
import { isBullMqEnabled } from '../../config/queue-backend';

import { InMemoryProviderService } from './in-memory-provider.service';
import { InMemoryProviderClient, InMemoryProviderEnum } from './types';
import { isClusterModeEnabled } from './utils';

const LOG_CONTEXT = 'WorkflowInMemoryProviderService';

const isSelfHosted = (): boolean => process.env.IS_SELF_HOSTED === 'true';
const isEnterprise = (): boolean => process.env.NOVU_ENTERPRISE === 'true';
const isMemoryDbConfigured = (): boolean =>
  !!(process.env.MEMORY_DB_CLUSTER_SERVICE_HOST && process.env.MEMORY_DB_CLUSTER_SERVICE_PORT);

/**
 * Rules for the provider selection:
 * - Community self-hosted always uses a single-node Redis instance for BullMQ.
 * - Self-hosted enterprise defaults to single-node Redis. Opt into MemoryDB when
 *   MEMORY_DB_CLUSTER_SERVICE_HOST/PORT are set, or into OSS Redis Cluster by
 *   enabling cluster mode. MemoryDB wins if both are configured.
 * - Novu Cloud uses MemoryDB, falling back to Redis Cluster when MemoryDB is
 *   not configured (see /in-memory-provider/providers/index.ts).
 * - `QUEUE_BACKEND=sqs` never calls this. BullMQ is gone, so MemoryDB is not
 *   opened. Cache and sockets stay on ElastiCache.
 *
 * Selection is intent-based, never validated here: cluster mode already routes
 * construction through the cluster path, so silently returning REDIS on an
 * incomplete cluster config would move queues to a different backend rather
 * than fix anything. Endpoint validation belongs to the provider mapping, which
 * fails startup with the offending provider named.
 */
export const selectWorkflowInMemoryProvider = (): InMemoryProviderEnum => {
  if (isSelfHosted()) {
    if (isEnterprise() && isMemoryDbConfigured()) {
      return InMemoryProviderEnum.MEMORY_DB;
    }

    if (isEnterprise() && isClusterModeEnabled()) {
      return InMemoryProviderEnum.REDIS_CLUSTER;
    }

    return InMemoryProviderEnum.REDIS;
  }

  return InMemoryProviderEnum.MEMORY_DB;
};

export class WorkflowInMemoryProviderService {
  public inMemoryProviderService?: InMemoryProviderService;
  public isCluster: boolean;

  constructor() {
    /*
     * MemoryDB and the workflow Redis exist for BullMQ. SQS-only keeps
     * ElastiCache for cache and sockets and must not open this client.
     */
    if (!isBullMqEnabled()) {
      this.isCluster = false;
      Logger.log('BullMQ is disabled; not connecting workflow Redis or MemoryDB', LOG_CONTEXT);

      return;
    }

    const provider = selectWorkflowInMemoryProvider();
    this.isCluster = this.isClusterMode();

    this.inMemoryProviderService = new InMemoryProviderService(provider, this.isCluster, false);
  }

  private descriptiveLogMessage(message) {
    return `[Provider: ${selectWorkflowInMemoryProvider()}] ${message}`;
  }

  private isClusterMode(): boolean {
    const isEnabled = isClusterModeEnabled();

    Logger.log(
      this.descriptiveLogMessage(`Cluster mode ${isEnabled ? 'is' : 'is not'} enabled for ${LOG_CONTEXT}`),
      LOG_CONTEXT
    );

    return isEnabled;
  }

  public async initialize(): Promise<void> {
    if (!this.inMemoryProviderService) {
      return;
    }

    await this.inMemoryProviderService.delayUntilReadiness();
  }

  public getClient(): InMemoryProviderClient {
    return this.inMemoryProviderService?.inMemoryProviderClient;
  }

  public isReady(): boolean {
    return this.inMemoryProviderService?.isClientReady() ?? false;
  }

  public providerInUseIsInClusterMode(): boolean {
    if (!this.inMemoryProviderService) {
      return false;
    }

    const providerConfigured = this.inMemoryProviderService.getProvider.configured;

    return this.isCluster || providerConfigured !== InMemoryProviderEnum.REDIS;
  }

  public async shutdown(): Promise<void> {
    if (!this.inMemoryProviderService) {
      return;
    }

    await this.inMemoryProviderService.shutdown();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { setTimeout } from 'timers/promises';

import {
  InMemoryProviderConfig,
  IProviderCluster,
  IProviderRedis,
} from './providers/providers';
import {
  Cluster,
  ClusterOptions,
  InMemoryProviderClient,
  InMemoryProviderEnum,
  Redis,
  RedisOptions,
  ScanStream,
} from './types';

const LOG_CONTEXT = 'InMemoryProviderService';

export class InMemoryProviderService {
  public inMemoryProviderClient: InMemoryProviderClient;
  public inMemoryProviderConfig: InMemoryProviderConfig;

  public isProviderClientReady: (string) => boolean;

  constructor(
    private loadedProvider: IProviderRedis | IProviderCluster,
    private isCluster: boolean,
    private enableAutoPipelining?: boolean
  ) {
    Logger.log(
      this.descriptiveLogMessage('In-memory provider service initialized'),
      LOG_CONTEXT
    );
    this.isProviderClientReady = loadedProvider.isClientReady;
    this.inMemoryProviderConfig = loadedProvider.getConfig();
    this.inMemoryProviderClient = this.inMemoryProviderSetup();
  }

  protected descriptiveLogMessage(message) {
    return `[Provider: ${this.loadedProvider.provider} | Cluster: ${
      this.isCluster ? 'Yes' : 'No'
    }] ${message}`;
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

    while (times <= retries && !this.isClientReady()) {
      times += 1;
      await setTimeout(timeout);
    }

    Logger.warn(
      this.descriptiveLogMessage(
        `Is being delayed ${times} times up to a total of ${retries}.`
      ),
      LOG_CONTEXT
    );

    if (times === retries) {
      Logger.error(
        this.descriptiveLogMessage(
          'It reached the limit of retries waiting for readiness.'
        ),
        LOG_CONTEXT
      );
    }
  }

  public getStatus(): string | unknown {
    if (this.inMemoryProviderClient) {
      return this.inMemoryProviderClient.status;
    }
  }

  public isClientReady(): boolean {
    return this.isProviderClientReady(this.getStatus());
  }

  public getClusterOptions(): ClusterOptions | undefined {
    if (this.inMemoryProviderClient && this.isCluster) {
      return this.inMemoryProviderClient.options;
    }
  }

  public getOptions(): RedisOptions | undefined {
    if (this.inMemoryProviderClient) {
      if (!this.isCluster) {
        const options: RedisOptions = this.inMemoryProviderClient.options;

        return options;
      } else {
        const clusterOptions: ClusterOptions =
          this.inMemoryProviderClient.options;

        return clusterOptions.redisOptions;
      }
    }
  }

  private inMemoryProviderSetup(): InMemoryProviderClient {
    Logger.verbose(
      this.descriptiveLogMessage(`In-memory provider service set up`),
      LOG_CONTEXT
    );

    const { getClient } = this.loadedProvider;

    const inMemoryProviderClient = getClient(
      this.isCluster && this.enableAutoPipelining
    );
    if (this.inMemoryProviderConfig.host && inMemoryProviderClient) {
      Logger.log(
        this.descriptiveLogMessage(
          `Connecting at ${this.inMemoryProviderConfig.host}`
        ),
        LOG_CONTEXT
      );

      inMemoryProviderClient.on('connect', () => {
        Logger.verbose(
          this.descriptiveLogMessage(`In-memory provider connected`),
          LOG_CONTEXT
        );
      });

      inMemoryProviderClient.on('connecting', () => {
        Logger.verbose(
          this.descriptiveLogMessage(`In-memory provider connecting`),
          LOG_CONTEXT
        );
      });

      inMemoryProviderClient.on('reconnecting', () => {
        Logger.verbose(
          this.descriptiveLogMessage(`In-memory provider reconnecting`),
          LOG_CONTEXT
        );
      });

      inMemoryProviderClient.on('close', () => {
        Logger.verbose(
          this.descriptiveLogMessage(`In-memory provider closing`),
          LOG_CONTEXT
        );
      });

      inMemoryProviderClient.on('end', () => {
        Logger.verbose(
          this.descriptiveLogMessage(`In-memory provider end`),
          LOG_CONTEXT
        );
      });

      inMemoryProviderClient.on('error', (error) => {
        Logger.error(
          error,
          this.descriptiveLogMessage(
            `There has been an error in the In-memory provider client`
          ),
          LOG_CONTEXT
        );
      });

      inMemoryProviderClient.on('ready', () => {
        Logger.log(
          this.descriptiveLogMessage(`In-memory provider ready`),
          LOG_CONTEXT
        );
      });

      inMemoryProviderClient.on('wait', () => {
        Logger.verbose(
          this.descriptiveLogMessage(`In-memory provider waiting`),
          LOG_CONTEXT
        );
      });

      return inMemoryProviderClient;
    }
  }

  public inMemoryScan(pattern: string): ScanStream {
    if (this.isCluster) {
      const client = this.inMemoryProviderClient as Cluster;

      return client.sscanStream(pattern);
    }

    const client = this.inMemoryProviderClient as Redis;

    return client.scanStream({ match: pattern });
  }

  public async shutdown(): Promise<void> {
    if (this.inMemoryProviderClient) {
      try {
        await this.inMemoryProviderClient.quit();
        Logger.verbose(
          this.descriptiveLogMessage(`In-memory provider service shutdown`),
          LOG_CONTEXT
        );
      } catch (error) {
        Logger.error(
          error,
          this.descriptiveLogMessage(
            `In-memory provider service shutdown has failed`
          ),
          LOG_CONTEXT
        );
      }
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

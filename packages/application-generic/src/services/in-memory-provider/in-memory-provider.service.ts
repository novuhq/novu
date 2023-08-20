import { Injectable, Logger } from '@nestjs/common';
import { setTimeout } from 'timers/promises';

import {
  getClientAndConfig,
  getClientAndConfigForCluster,
  InMemoryProviderConfig,
} from './providers';
import {
  Cluster,
  ClusterOptions,
  InMemoryProviderClient,
  InMemoryProviderEnum,
  Redis,
  RedisOptions,
  ScanStream,
} from './types';

import { GetIsInMemoryClusterModeEnabled } from '../../usecases';

const LOG_CONTEXT = 'InMemoryProviderService';

@Injectable()
export class InMemoryProviderService {
  public inMemoryProviderClient: InMemoryProviderClient;
  public inMemoryProviderConfig: InMemoryProviderConfig;

  public isProviderClientReady: (string) => boolean;
  private nodesInterval;

  constructor(
    private getIsInMemoryClusterModeEnabled: GetIsInMemoryClusterModeEnabled,
    private provider: InMemoryProviderEnum,
    private enableAutoPipelining?: boolean
  ) {
    Logger.log('In-memory provider service initialized', LOG_CONTEXT);

    this.inMemoryProviderClient = this.buildClient(provider);
  }

  private buildClient(provider: InMemoryProviderEnum): InMemoryProviderClient {
    // TODO: Temporary while migrating to MemoryDB
    if (provider === InMemoryProviderEnum.OLD_INSTANCE_REDIS) {
      return this.oldInstanceInMemoryProviderSetup();
    }

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

    Logger.warn(
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
    return this.isProviderClientReady(this.getStatus());
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
      if (
        this.provider === InMemoryProviderEnum.OLD_INSTANCE_REDIS ||
        !this.isClusterMode()
      ) {
        const options: RedisOptions = this.inMemoryProviderClient.options;

        return options;
      } else {
        const clusterOptions: ClusterOptions =
          this.inMemoryProviderClient.options;

        return clusterOptions.redisOptions;
      }
    }
  }

  private inMemoryClusterProviderSetup(provider): Cluster | undefined {
    Logger.verbose(
      `In-memory cluster service set up for ${provider}`,
      LOG_CONTEXT
    );

    const { getConfig, getClient, isClientReady } =
      getClientAndConfigForCluster(provider);

    this.isProviderClientReady = isClientReady;
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
            Logger.log(
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
            e,
            'Connecting to cluster executing intervals has failed',
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
          error,
          'There has been an error in the InMemory Cluster provider client for provider: ' +
            provider,
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

    const { getClient, getConfig, isClientReady } = getClientAndConfig();

    this.isProviderClientReady = isClientReady;
    this.inMemoryProviderConfig = getConfig();
    const { host, port, ttl } = getConfig();

    if (!host) {
      Logger.warn('Missing host for in-memory provider', LOG_CONTEXT);
    }

    const inMemoryProviderClient = getClient();
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
          error,
          'There has been an error in the InMemory provider client',
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

  /**
   * TODO: Temporary while we migrate to MemoryDB
   */
  private oldInstanceInMemoryProviderSetup(): Redis | undefined {
    Logger.verbose('In-memory service set up', LOG_CONTEXT);

    const { getClient, getConfig, isClientReady } = getClientAndConfig();

    this.isProviderClientReady = isClientReady;
    this.inMemoryProviderConfig = getConfig();
    const { host, port, ttl } = getConfig();

    if (!host) {
      Logger.warn('Missing host for in-memory provider', LOG_CONTEXT);
    }

    const inMemoryProviderClient = getClient();
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
          error,
          'There has been an error in the InMemory provider client',
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

  public inMemoryScan(pattern: string): ScanStream {
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

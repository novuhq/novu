import { Logger } from '@nestjs/common';
import { setTimeout } from 'timers/promises';

import {
  Cluster,
  ClusterOptions,
  InMemoryProviderClient,
  InMemoryProviderConfig,
  InMemoryProviderEnum,
  IProviderConfiguration,
  Redis,
  RedisOptions,
  ScanStream,
} from '../shared/types';

interface IInMemoryProvider {
  validateConfig(config: IProviderConfiguration): boolean;
  isClientReady(): boolean;
}

export abstract class InMemoryProvider implements IInMemoryProvider {
  abstract LOG_CONTEXT;
  abstract isCluster: boolean;
  protected abstract config: InMemoryProviderConfig;
  protected abstract providerId: InMemoryProviderEnum;
  protected abstract client: InMemoryProviderClient;

  protected CLIENT_READY = 'ready';
  protected DEFAULT_TTL_SECONDS = 60 * 60 * 2;
  protected DEFAULT_CONNECT_TIMEOUT = 50000;
  protected DEFAULT_HOST = 'localhost';
  protected DEFAULT_KEEP_ALIVE = 30000;
  protected DEFAULT_KEY_PREFIX = '';
  protected DEFAULT_FAMILY = 4;
  protected DEFAULT_PORT = 6379;

  constructor(config: IProviderConfiguration) {
    this.setConfig(config);

    if (!this.validateConfig()) {
      throw new Error(
        `The configuration for the provider ${this.getProviderId()} is invalid.`
      );
    }

    this.initialize();

    this.setupEvents();

    // todo - check if delayUntilReadiness is needed to be recreated
  }

  abstract initialize(): boolean;

  abstract getProviderId(): InMemoryProviderEnum;

  abstract validateConfig(): boolean;

  abstract setConfig(config: IProviderConfiguration): void;

  abstract isClientReady(): boolean;

  protected descriptiveLogMessage(message) {
    return `[Provider: ${this.providerId} | Cluster: ${
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
      this.LOG_CONTEXT
    );

    if (times === retries) {
      Logger.error(
        this.descriptiveLogMessage(
          'It reached the limit of retries waiting for readiness.'
        ),
        this.LOG_CONTEXT
      );
    }
  }

  public getStatus(): string | unknown {
    if (this.client) {
      return this.client.status;
    }
  }

  /*
   * public getClusterOptions(): ClusterOptions | undefined {
   *   if (this.inMemoryProviderClient && this.isCluster) {
   *     return this.inMemoryProviderClient.options;
   *   }
   * }
   */

  public getOptions(): RedisOptions | undefined {
    if (!this.client) {
      return undefined;
    }

    if (this.isCluster) {
      const clusterOptions: ClusterOptions = this.client.options;

      return clusterOptions.redisOptions;
    } else {
      const options: RedisOptions = this.client.options;

      return options;
    }
  }

  private setupEvents() {
    Logger.verbose(
      this.descriptiveLogMessage(`In-memory provider service set up`),
      this.LOG_CONTEXT
    );

    Logger.log(
      this.descriptiveLogMessage(`Connecting at ${this.config.host}`),
      this.LOG_CONTEXT
    );

    this.client.on('connect', () => {
      Logger.verbose(
        this.descriptiveLogMessage(`In-memory provider connected`),
        this.LOG_CONTEXT
      );
    });

    this.client.on('connecting', () => {
      Logger.verbose(
        this.descriptiveLogMessage(`In-memory provider connecting`),
        this.LOG_CONTEXT
      );
    });

    this.client.on('reconnecting', () => {
      Logger.verbose(
        this.descriptiveLogMessage(`In-memory provider reconnecting`),
        this.LOG_CONTEXT
      );
    });

    this.client.on('close', () => {
      Logger.verbose(
        this.descriptiveLogMessage(`In-memory provider closing`),
        this.LOG_CONTEXT
      );
    });

    this.client.on('end', () => {
      Logger.verbose(
        this.descriptiveLogMessage(`In-memory provider end`),
        this.LOG_CONTEXT
      );
    });

    this.client.on('error', (error) => {
      Logger.error(
        error,
        this.descriptiveLogMessage(
          `There has been an error in the In-memory provider client`
        ),
        this.LOG_CONTEXT
      );
    });

    this.client.on('ready', () => {
      Logger.log(
        this.descriptiveLogMessage(`In-memory provider ready`),
        this.LOG_CONTEXT
      );
    });

    this.client.on('wait', () => {
      Logger.verbose(
        this.descriptiveLogMessage(`In-memory provider waiting`),
        this.LOG_CONTEXT
      );
    });
  }

  public inMemoryScan(pattern: string): ScanStream {
    if (this.isCluster) {
      const client = this.client as Cluster;

      return client.sscanStream(pattern);
    }

    const client = this.client as Redis;

    return client.scanStream({ match: pattern });
  }

  public async shutdown(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        Logger.verbose(
          this.descriptiveLogMessage(`In-memory provider service shutdown`),
          this.LOG_CONTEXT
        );
      } catch (error) {
        Logger.error(
          error,
          this.descriptiveLogMessage(
            `In-memory provider service shutdown has failed`
          ),
          this.LOG_CONTEXT
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

  /*
   * This method was designed to send the instance to the distributed lock service during initialization.
   */
  getClient(): InMemoryProviderClient {
    return this.client;
  }

  getConfig(): InMemoryProviderConfig {
    return this.config;
  }
}

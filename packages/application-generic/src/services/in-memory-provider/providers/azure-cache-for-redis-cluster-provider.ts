import { Logger } from '@nestjs/common';

import { convertStringValues } from '../shared/variable-mappers';

import {
  Cluster,
  ClusterNode,
  ClusterOptions,
  IEnvironmentConfigOptions,
  InMemoryProviderEnum,
  IProviderClusterConfigOptions,
  IProviderConfiguration,
  Redis,
  ConnectionOptions,
} from '../shared/types';
import { InMemoryProvider } from './in-memory-provider';

interface IAzureCacheForRedisClusterConfig {
  connectTimeout?: string;
  family?: string;
  host?: string;
  keepAlive?: string;
  keyPrefix?: string;
  username?: string;
  password?: string;
  port?: string;
  tls?: ConnectionOptions;
  ttl?: string;
}

export interface IAzureCacheForRedisClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  username?: string;
  options?: IProviderClusterConfigOptions;
  password?: string;
  port?: number;
  tls?: ConnectionOptions;
  ttl: number;
}

export class AzureCacheForRedisProvider extends InMemoryProvider {
  LOG_CONTEXT = 'AzureCacheForRedisProvider';
  providerId = InMemoryProviderEnum.AZURE_CACHE_FOR_REDIS;
  isCluster = true;

  protected config: IAzureCacheForRedisClusterProviderConfig;
  protected client: Cluster;

  initialize(): boolean {
    const { instances, options, password, tls, username } = this.config;
    const { enableAutoPipelining, showFriendlyErrorStack } = options || {};

    const clusterOptions: ClusterOptions = {
      dnsLookup: (address, callback) => callback(null, address),
      enableAutoPipelining: enableAutoPipelining ?? false,
      enableOfflineQueue: false,
      redisOptions: {
        tls,
        connectTimeout: 10000,
        ...(password && { password }),
        ...(username && { username }),
      },
      scaleReads: 'slave',
      showFriendlyErrorStack,
      slotsRefreshTimeout: 10000,
    };

    Logger.log(
      `Initializing Azure Cache For Redis Cluster Provider with ${instances?.length} ` +
        `instances and auto-pipelining as ${enableAutoPipelining}`
    );

    this.client = new Redis.Cluster(instances, clusterOptions);

    return true;
  }

  getProviderId(): InMemoryProviderEnum {
    return this.providerId;
  }

  setConfig(config: IProviderConfiguration) {
    this.config = this.getAzureCacheForRedisClusterProviderConfig(
      config.envOptions,
      config.options
    );
  }

  public isClientReady = (): boolean =>
    this.client.status === this.CLIENT_READY;

  validateConfig(): boolean {
    const validateAddress = !!this.config.host && !!this.config.port;

    const validateInstances =
      this.config.instances && this.config.instances.length > 0;

    return validateAddress && validateInstances;
  }

  getAzureCacheForRedisClusterProviderConfig = (
    envOptions?: IEnvironmentConfigOptions,
    options?: IProviderClusterConfigOptions
  ): IAzureCacheForRedisClusterProviderConfig => {
    let redisClusterConfig: Partial<IAzureCacheForRedisClusterConfig>;

    if (envOptions) {
      redisClusterConfig = {
        host: convertStringValues(envOptions.host),
        password: convertStringValues(envOptions.password),
        port: convertStringValues(envOptions.ports),
        username: convertStringValues(envOptions.username),
      };
    } else {
      redisClusterConfig = {
        host: convertStringValues(
          process.env.AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_HOST
        ),
        password: convertStringValues(
          process.env.AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_PASSWORD
        ),
        port: convertStringValues(
          process.env.AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_PORT
        ),
        username: convertStringValues(
          process.env.AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_USERNAME
        ),
      };
    }

    redisClusterConfig = {
      ...redisClusterConfig,
      ttl: convertStringValues(process.env.REDIS_CLUSTER_TTL),
      connectTimeout: convertStringValues(
        process.env.REDIS_CLUSTER_CONNECTION_TIMEOUT
      ),
      keepAlive: convertStringValues(process.env.REDIS_CLUSTER_KEEP_ALIVE),
      family: convertStringValues(process.env.REDIS_CLUSTER_FAMILY),
      keyPrefix: convertStringValues(process.env.REDIS_CLUSTER_KEY_PREFIX),
      tls: (process.env
        .AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_TLS as ConnectionOptions)
        ? {
            servername: convertStringValues(
              process.env.AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_HOST
            ),
          }
        : {},
    };

    const host = redisClusterConfig.host;
    const port = redisClusterConfig.port
      ? Number(redisClusterConfig.port)
      : undefined;
    const username = redisClusterConfig.username;
    const password = redisClusterConfig.password;
    const connectTimeout = redisClusterConfig.connectTimeout
      ? Number(redisClusterConfig.connectTimeout)
      : this.DEFAULT_CONNECT_TIMEOUT;
    const family = redisClusterConfig.family
      ? Number(redisClusterConfig.family)
      : this.DEFAULT_FAMILY;
    const keepAlive = redisClusterConfig.keepAlive
      ? Number(redisClusterConfig.keepAlive)
      : this.DEFAULT_KEEP_ALIVE;
    const keyPrefix = redisClusterConfig.keyPrefix ?? this.DEFAULT_KEY_PREFIX;
    const ttl = redisClusterConfig.ttl
      ? Number(redisClusterConfig.ttl)
      : this.DEFAULT_TTL_SECONDS;

    const instances: ClusterNode[] = [{ host, port }];

    return {
      host,
      port,
      instances,
      username,
      password,
      connectTimeout,
      family,
      keepAlive,
      keyPrefix,
      ttl,
      tls: redisClusterConfig.tls,
      ...(options && { options }),
    };
  };
}

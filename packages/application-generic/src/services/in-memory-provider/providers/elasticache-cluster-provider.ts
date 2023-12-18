import { Logger } from '@nestjs/common';

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
import { convertStringValues } from '../shared/variable-mappers';

interface IElastiCacheClusterConfig {
  connectTimeout?: string;
  family?: string;
  host?: string;
  keepAlive?: string;
  keyPrefix?: string;
  password?: string;
  port?: string;
  tls?: ConnectionOptions;
  ttl?: string;
  username?: string;
}

export interface IElastiCacheClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  options?: IProviderClusterConfigOptions;
  password?: string;
  port?: number;
  tls?: ConnectionOptions;
  ttl: number;
  username?: string;
}

export class ElastiCacheClusterProvider extends InMemoryProvider {
  LOG_CONTEXT = 'ElastiCacheClusterProvider';
  providerId = InMemoryProviderEnum.ELASTI_CACHE;
  isCluster = true;

  protected config: IElastiCacheClusterProviderConfig;
  protected client: Cluster;

  initialize(): boolean {
    const { instances, options, password, tls } = this.config;
    const { enableAutoPipelining, showFriendlyErrorStack } = options || {};

    const clusterOptions: ClusterOptions = {
      dnsLookup: (address, callback) => callback(null, address),
      enableAutoPipelining: enableAutoPipelining ?? false,
      enableOfflineQueue: false,
      enableReadyCheck: true,
      redisOptions: {
        tls,
        ...(password && { password }),
        connectTimeout: 10000,
      },
      scaleReads: 'slave',
      showFriendlyErrorStack,
      slotsRefreshTimeout: 10000,
    };

    Logger.log(
      `Initializing ElastiCache Cluster Provider with ${instances?.length} instances and auto-pipelining as ${enableAutoPipelining}`
    );

    this.client = new Redis.Cluster(instances, clusterOptions);

    return true;
  }

  getProviderId(): InMemoryProviderEnum {
    return this.providerId;
  }

  setConfig(config: IProviderConfiguration) {
    this.config = this.getElastiCacheClusterProviderConfig(
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

  getElastiCacheClusterProviderConfig = (
    envOptions?: IEnvironmentConfigOptions,
    options?: IProviderClusterConfigOptions
  ): IElastiCacheClusterProviderConfig => {
    let redisClusterConfig: Partial<IElastiCacheClusterConfig>;

    if (envOptions) {
      redisClusterConfig = {
        host: convertStringValues(envOptions.host),
        password: convertStringValues(envOptions.password),
        port: convertStringValues(envOptions.ports),
        username: convertStringValues(envOptions.username),
      };
    } else {
      redisClusterConfig = {
        host: convertStringValues(process.env.ELASTICACHE_CLUSTER_SERVICE_HOST),
        password: convertStringValues(process.env.REDIS_CLUSTER_PASSWORD),
        port: convertStringValues(process.env.ELASTICACHE_CLUSTER_SERVICE_PORT),
        username: convertStringValues(process.env.REDIS_CLUSTER_USERNAME),
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
      tls: (process.env.ELASTICACHE_CLUSTER_SERVICE_TLS as ConnectionOptions)
        ? {
            servername: convertStringValues(
              process.env.ELASTICACHE_CLUSTER_SERVICE_HOST
            ),
          }
        : {},
    };

    const host = redisClusterConfig.host;
    const port = redisClusterConfig.port
      ? Number(redisClusterConfig.port)
      : undefined;
    const password = redisClusterConfig.password;
    const username = redisClusterConfig.username;
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
      password,
      username,
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

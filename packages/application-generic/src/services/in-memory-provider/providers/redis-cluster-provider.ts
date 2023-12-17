import { Logger } from '@nestjs/common';

import { convertStringValues } from '../shared/variable-mappers';
import {
  Cluster,
  ClusterNode,
  ClusterOptions,
  IEnvironmentConfigOptions,
  IProviderClusterConfigOptions,
  Redis,
  ConnectionOptions,
  InMemoryProviderEnum,
  IProviderConfiguration,
} from '../shared/types';
import { InMemoryProvider } from './in-memory-provider';

interface IRedisClusterConfig {
  connectTimeout?: string;
  family?: string;
  host?: string;
  keepAlive?: string;
  keyPrefix?: string;
  password?: string;
  ports?: string;
  tls?: ConnectionOptions;
  ttl?: string;
  username?: string;
}

export interface IRedisClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  options?: IProviderClusterConfigOptions;
  password?: string;
  ports?: number[];
  tls?: ConnectionOptions;
  ttl: number;
  username?: string;
}

export class RedisClusterProvider extends InMemoryProvider {
  LOG_CONTEXT = 'RedisClusterProvider';
  providerId = InMemoryProviderEnum.REDIS_CLUSTER;
  isCluster = true;

  protected config: IRedisClusterProviderConfig;
  protected client: Cluster;

  initialize(): boolean {
    const { instances, options } = this.config || {};
    const { enableAutoPipelining, showFriendlyErrorStack } = options || {};

    const clusterOptions: ClusterOptions = {
      enableAutoPipelining: enableAutoPipelining ?? false,
      enableOfflineQueue: false,
      enableReadyCheck: true,
      scaleReads: 'slave',
      showFriendlyErrorStack,
      slotsRefreshTimeout: 2000,
    };

    Logger.log(
      `Initializing Redis Cluster Provider with ${instances?.length} instances and auto-pipelining as ${enableAutoPipelining}`
    );

    this.client = new Redis.Cluster(instances, clusterOptions);

    return true;
  }
  getProviderId(): InMemoryProviderEnum {
    return this.providerId;
  }

  setConfig(config: IProviderConfiguration) {
    this.config = this.getRedisClusterProviderConfig(
      config.envOptions,
      config.options
    );
  }

  public isClientReady = (): boolean =>
    this.client.status === this.CLIENT_READY;

  validateConfig(): boolean {
    const validPorts =
      this.config.ports.length > 0 &&
      this.config.ports.every((port: number) => Number.isInteger(port));

    const validateInstances =
      this.config.instances && this.config.instances.length > 0;

    return !!this.config.host && validPorts && validateInstances;
  }

  getRedisClusterProviderConfig = (
    envOptions?: IEnvironmentConfigOptions,
    options?: IProviderClusterConfigOptions
  ): IRedisClusterProviderConfig => {
    let redisClusterConfig: Partial<IRedisClusterConfig>;

    if (envOptions) {
      redisClusterConfig = {
        host: convertStringValues(envOptions.host),
        password: convertStringValues(envOptions.password),
        ports: convertStringValues(envOptions.ports),
        username: convertStringValues(envOptions.username),
      };
    } else {
      redisClusterConfig = {
        host: convertStringValues(process.env.REDIS_CLUSTER_SERVICE_HOST),
        password: convertStringValues(process.env.REDIS_CLUSTER_PASSWORD),
        ports: convertStringValues(process.env.REDIS_CLUSTER_SERVICE_PORTS),
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
      tls: process.env.REDIS_CLUSTER_TLS as ConnectionOptions,
    };

    const host = redisClusterConfig.host;
    const ports = redisClusterConfig.ports
      ? JSON.parse(redisClusterConfig.ports)
      : [];
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

    const instances: ClusterNode[] = ports.map(
      (port: number): ClusterNode => ({ host, port })
    );

    return {
      host,
      ports,
      instances,
      password,
      username,
      connectTimeout,
      family,
      keepAlive,
      keyPrefix,
      ttl,
      ...(options && { options }),
    };
  };
}

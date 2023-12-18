import { Logger } from '@nestjs/common';

import { convertStringValues } from '../shared/variable-mappers';

import {
  Cluster,
  ClusterNode,
  ClusterOptions,
  ConnectionOptions,
  IEnvironmentConfigOptions,
  IMemoryDbClusterProviderConfig,
  InMemoryProviderEnum,
  IProviderClusterConfigOptions,
  IProviderConfiguration,
  Redis,
} from '../shared/types';
import { InMemoryProvider } from './in-memory-provider';

interface IMemoryDbClusterConfig {
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

export class MemoryDbClusterProvider extends InMemoryProvider {
  LOG_CONTEXT = 'MemoryDbClusterProvider';
  providerId = InMemoryProviderEnum.MEMORY_DB;
  isCluster = true;

  protected config: IMemoryDbClusterProviderConfig;
  protected client: Cluster;

  initialize(): boolean {
    const { instances, options, password, username, tls } = this.config;
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
      `Initializing MemoryDb Cluster Provider with ${instances?.length} instances and auto-pipelining as ${enableAutoPipelining}`
    );

    this.client = new Redis.Cluster(instances, clusterOptions);

    return true;
  }
  getProviderId(): InMemoryProviderEnum {
    return this.providerId;
  }

  setConfig(config: IProviderConfiguration) {
    this.config = this.getMemoryDbClusterProviderConfig(
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

  getMemoryDbClusterProviderConfig = (
    envOptions?: IEnvironmentConfigOptions,
    options?: IProviderClusterConfigOptions
  ): IMemoryDbClusterProviderConfig => {
    let redisClusterConfig: Partial<IMemoryDbClusterConfig>;

    if (envOptions) {
      redisClusterConfig = {
        host: convertStringValues(envOptions.host),
        password: convertStringValues(envOptions.password),
        port: convertStringValues(envOptions.ports),
        username: convertStringValues(envOptions.username),
      };
    } else {
      redisClusterConfig = {
        host: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_HOST),
        password: convertStringValues(
          process.env.MEMORY_DB_CLUSTER_SERVICE_PASSWORD
        ),

        port: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_PORT),
        username: convertStringValues(
          process.env.MEMORY_DB_CLUSTER_SERVICE_USERNAME
        ),
      };
    }

    redisClusterConfig = {
      ...redisClusterConfig,
      ttl: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_TTL),
      connectTimeout: convertStringValues(
        process.env.MEMORY_DB_CLUSTER_SERVICE_CONNECTION_TIMEOUT
      ),
      keepAlive: convertStringValues(
        process.env.MEMORY_DB_CLUSTER_SERVICE_KEEP_ALIVE
      ),
      family: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_FAMILY),
      keyPrefix: convertStringValues(
        process.env.MEMORY_DB_CLUSTER_SERVICE_KEY_PREFIX
      ),
      tls: (process.env.MEMORY_DB_CLUSTER_SERVICE_TLS as ConnectionOptions)
        ? {
            servername: convertStringValues(
              process.env.MEMORY_DB_CLUSTER_SERVICE_HOST
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

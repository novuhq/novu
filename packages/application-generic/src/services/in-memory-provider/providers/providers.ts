import { Logger } from '@nestjs/common';

import { InMemoryProviderEnum, Redis } from '../types';

import { PlatformException } from '../../../utils/exceptions';

import {
  getAzureCacheForRedisCluster,
  getAzureCacheForRedisClusterProviderConfig,
  IAzureCacheForRedisClusterProviderConfig,
  isClientReady as isAzureCacheForRedisClientReady,
  validateAzureCacheForRedisClusterProviderConfig,
} from './azure-cache-for-redis-cluster-provider';
import {
  getElasticacheCluster,
  getElasticacheClusterProviderConfig,
  IElasticacheClusterProviderConfig,
  isClientReady as isElasticacheClientReady,
  validateElasticacheClusterProviderConfig,
} from './elasticache-cluster-provider';
import {
  getMemoryDbCluster,
  getMemoryDbClusterProviderConfig,
  IMemoryDbClusterProviderConfig,
  isClientReady as isMemoryDbClientReady,
  validateMemoryDbClusterProviderConfig,
} from './memory-db-cluster-provider';
import {
  getRedisInstance,
  getRedisProviderConfig,
  IRedisProviderConfig,
  isClientReady as isRedisClientReady,
  validateRedisProviderConfig,
} from './redis-provider';
import {
  Cluster,
  ClusterOptions,
  getRedisCluster,
  getRedisClusterProviderConfig,
  IRedisClusterProviderConfig,
  isClientReady as isRedisClusterClientReady,
  validateRedisClusterProviderConfig,
} from './redis-cluster-provider';

export type InMemoryProviderConfig =
  | IAzureCacheForRedisClusterProviderConfig
  | IElasticacheClusterProviderConfig
  | IMemoryDbClusterProviderConfig
  | IRedisProviderConfig
  | IRedisClusterProviderConfig;

interface IProviderInMemory {
  isClientReady: (string) => boolean;
  provider: InMemoryProviderEnum;
  validate: () => boolean;
}

export interface IProviderRedis extends IProviderInMemory {
  getClient: () => Redis | undefined;
  getConfig: () => IRedisProviderConfig;
}

export interface IProviderCluster extends IProviderInMemory {
  getClient: (enableAutoPipelining?: boolean) => Cluster | undefined;
  getConfig: () => InMemoryProviderConfig;
}

const LOG_CONTEXT = 'InMemoryProviderService/Providers';

const providers = {
  [InMemoryProviderEnum.AZURE_CACHE_FOR_REDIS]: {
    getClient: getAzureCacheForRedisCluster,
    getConfig: getAzureCacheForRedisClusterProviderConfig,
    isClientReady: isAzureCacheForRedisClientReady,
    provider: InMemoryProviderEnum.AZURE_CACHE_FOR_REDIS,
    validate: validateAzureCacheForRedisClusterProviderConfig,
  },
  [InMemoryProviderEnum.ELASTICACHE]: {
    getClient: getElasticacheCluster,
    getConfig: getElasticacheClusterProviderConfig,
    isClientReady: isElasticacheClientReady,
    provider: InMemoryProviderEnum.ELASTICACHE,
    validate: validateElasticacheClusterProviderConfig,
  },
  [InMemoryProviderEnum.MEMORY_DB]: {
    getClient: getMemoryDbCluster,
    getConfig: getMemoryDbClusterProviderConfig,
    isClientReady: isMemoryDbClientReady,
    provider: InMemoryProviderEnum.MEMORY_DB,
    validate: validateMemoryDbClusterProviderConfig,
  },
  [InMemoryProviderEnum.REDIS]: {
    getClient: getRedisInstance,
    getConfig: getRedisProviderConfig,
    isClientReady: isRedisClientReady,
    provider: InMemoryProviderEnum.REDIS,
    validate: validateRedisProviderConfig,
  },
  [InMemoryProviderEnum.REDIS_CLUSTER]: {
    getClient: getRedisCluster,
    getConfig: getRedisClusterProviderConfig,
    isClientReady: isRedisClusterClientReady,
    provider: InMemoryProviderEnum.REDIS_CLUSTER,
    validate: validateRedisClusterProviderConfig,
  },
};

export const getSingleInstanceProvider = (): IProviderRedis => {
  return providers[InMemoryProviderEnum.REDIS];
};

export const getClusterProvider = (providerId): IProviderCluster => {
  if (providerId === InMemoryProviderEnum.REDIS) {
    const message = `Provider ${providerId} is not available in Cluster Mode`;
    Logger.error(message, LOG_CONTEXT);
    throw new PlatformException(message);
  }

  return providers[providerId];
};

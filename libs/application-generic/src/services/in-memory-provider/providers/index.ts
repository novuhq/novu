import { Logger } from '@nestjs/common';
import { PlatformException } from '../../../utils/exceptions';
import { InMemoryProviderEnum, Redis } from '../types';
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
  Cluster,
  getRedisCluster,
  getRedisClusterProviderConfig,
  IRedisClusterProviderConfig,
  isClientReady as isRedisClusterClientReady,
  validateRedisClusterProviderConfig
} from './redis-cluster-provider';
import {
  getRedisMasterSlaveCluster,
  getRedisMasterSlaveProviderConfig,
  IRedisMasterSlaveProviderConfig,
  isClientReady as isRedisMasterSlaveClientReady,
  validateRedisMasterSlaveProviderConfig,
} from './redis-master-slave-provider';


import {
  getRedisInstance,
  getRedisProviderConfig,
  IRedisProviderConfig,
  isClientReady as isRedisClientReady,
  validateRedisProviderConfig,
} from './redis-provider';

export type InMemoryProviderConfig =
  | IAzureCacheForRedisClusterProviderConfig
  | IElasticacheClusterProviderConfig
  | IMemoryDbClusterProviderConfig
  | IRedisProviderConfig
  | IRedisClusterProviderConfig
  | IRedisMasterSlaveProviderConfig;

const LOG_CONTEXT = 'InMemoryProviders';

export const getClientAndConfig = (): {
  getClient: () => Redis | undefined;
  getConfig: () => IRedisProviderConfig;
  isClientReady: (string) => boolean;
  provider: InMemoryProviderEnum;
  validate: () => boolean;
} => {
  return {
    getClient: getRedisInstance,
    getConfig: getRedisProviderConfig,
    isClientReady: isRedisClientReady,
    provider: InMemoryProviderEnum.REDIS,
    validate: validateRedisProviderConfig,
  };
};

export const getClientAndConfigForCluster = (
  providerId: InMemoryProviderEnum
): {
  getClient: (enableAutoPipelining?: boolean) => Cluster | undefined;
  getConfig: () => InMemoryProviderConfig;
  isClientReady: (string) => boolean;
  provider: InMemoryProviderEnum;
  validate: () => boolean;
} => {
  const clusterProviders = {
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
    [InMemoryProviderEnum.REDIS_CLUSTER]: {
      getClient: getRedisCluster,
      getConfig: getRedisClusterProviderConfig,
      isClientReady: isRedisClusterClientReady,
      provider: InMemoryProviderEnum.REDIS_CLUSTER,
      validate: validateRedisClusterProviderConfig,
    },
    [InMemoryProviderEnum.REDIS_MASTER_SLAVE]: {
      getClient: getRedisMasterSlaveCluster,
      getConfig: getRedisMasterSlaveProviderConfig,
      isClientReady: isRedisMasterSlaveClientReady,
      provider: InMemoryProviderEnum.REDIS_MASTER_SLAVE,
      validate: validateRedisMasterSlaveProviderConfig,
    },
  };

  const provider = clusterProviders[providerId];

  if (!provider || !provider.validate()) {
    const defaultProvider = clusterProviders[InMemoryProviderEnum.REDIS_CLUSTER];
    if (!defaultProvider.validate()) {
      const message = `Provider ${providerId} is not properly configured in the environment variables`;
      Logger.error(message, LOG_CONTEXT);
      throw new PlatformException(message);
    }

    return defaultProvider;
  }

  return provider;
};

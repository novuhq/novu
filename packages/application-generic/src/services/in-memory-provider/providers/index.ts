import { Logger } from '@nestjs/common';

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

import { InMemoryProviderEnum, Redis } from '../types';

import { PlatformException } from '../../../utils/exceptions';

export type InMemoryProviderConfig =
  | IElasticacheClusterProviderConfig
  | IMemoryDbClusterProviderConfig
  | IRedisProviderConfig
  | IRedisClusterProviderConfig;

const LOG_CONTEXT = 'InMemoryProviders';

export const getClientAndConfig = (): {
  getClient: () => Redis | undefined;
  getConfig: () => IRedisProviderConfig;
  isClientReady: (string) => boolean;
  validate: () => boolean;
} => {
  return {
    getClient: getRedisInstance,
    getConfig: getRedisProviderConfig,
    isClientReady: isRedisClientReady,
    validate: validateRedisProviderConfig,
  };
};

export const getClientAndConfigForCluster = (
  providerId: InMemoryProviderEnum
): {
  getClient: (enableAutoPipelining?: boolean) => Cluster | undefined;
  getConfig: () => InMemoryProviderConfig;
  isClientReady: (string) => boolean;
  validate: () => boolean;
} => {
  const clusterProviders = {
    [InMemoryProviderEnum.ELASTICACHE]: {
      getClient: getElasticacheCluster,
      getConfig: getElasticacheClusterProviderConfig,
      isClientReady: isElasticacheClientReady,
      validate: validateElasticacheClusterProviderConfig,
    },
    [InMemoryProviderEnum.MEMORY_DB]: {
      getClient: getMemoryDbCluster,
      getConfig: getMemoryDbClusterProviderConfig,
      isClientReady: isMemoryDbClientReady,
      validate: validateMemoryDbClusterProviderConfig,
    },
    [InMemoryProviderEnum.REDIS]: {
      getClient: getRedisCluster,
      getConfig: getRedisClusterProviderConfig,
      isClientReady: isRedisClusterClientReady,
      validate: validateRedisClusterProviderConfig,
    },
  };

  const provider = clusterProviders[providerId];

  if (
    !provider ||
    !provider.validate() ||
    providerId === InMemoryProviderEnum.REDIS
  ) {
    const defaultProvider = clusterProviders[InMemoryProviderEnum.REDIS];
    if (!defaultProvider.validate()) {
      const message = `Provider ${providerId} is not properly configured in the environment variables`;
      Logger.error(message, LOG_CONTEXT);
      throw new PlatformException(message);
    }

    return defaultProvider;
  }

  return provider;
};

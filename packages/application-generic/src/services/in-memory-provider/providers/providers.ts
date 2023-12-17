/*
 * import { Logger } from '@nestjs/common';
 *
 * import {
 *   Cluster,
 *   ClusterOptions,
 *   InMemoryProviderEnum,
 *   IProviderClusterConfigOptions,
 *   IRedisConfigOptions,
 *   Redis,
 * } from '../types';
 *
 * import { PlatformException } from '../../../utils/exceptions';
 *
 * import {
 *   getAzureCacheForRedisCluster,
 *   getAzureCacheForRedisClusterProviderConfig,
 *   IAzureCacheForRedisClusterProviderConfig,
 *   isClientReady as isAzureCacheForRedisClientReady,
 *   validateAzureCacheForRedisClusterProviderConfig,
 * } from './azure-cache-for-redis-cluster-provider';
 * import {
 *   getElasticacheCluster,
 *   getElasticacheClusterProviderConfig,
 *   IElasticacheClusterProviderConfig,
 *   isClientReady as isElasticacheClientReady,
 *   validateElasticacheClusterProviderConfig,
 * } from './elasticache-cluster-provider';
 * import {
 *   getMemoryDbCluster,
 *   getMemoryDbClusterProviderConfig,
 *   IMemoryDbClusterProviderConfig,
 *   isClientReady as isMemoryDbClientReady,
 *   validateMemoryDbClusterProviderConfig,
 * } from './memory-db-cluster-provider';
 * import {
 *   getRedisInstance,
 *   getRedisProviderConfig,
 *   IRedisProviderConfig,
 *   isClientReady as isRedisClientReady,
 *   validateRedisProviderConfig,
 * } from './redis-provider';
 * import {
 *   getRedisCluster,
 *   getRedisClusterProviderConfig,
 *   IRedisClusterProviderConfig,
 *   isClientReady as isRedisClusterClientReady,
 *   validateRedisClusterProviderConfig,
 * } from './redis-cluster-provider';
 *
 * export { IRedisProviderConfig };
 *
 *
 * interface IProviderInMemory {
 *   isClientReady: (string) => boolean;
 *   isCluster: boolean;
 *   provider: InMemoryProviderEnum;
 * }
 *
 * export interface IProviderRedis extends IProviderInMemory {
 *   getClient: (config: IRedisProviderConfig) => Redis | undefined;
 *   getConfig: (
 *     envOptions?: any,
 *     options?: IRedisConfigOptions
 *   ) => IRedisProviderConfig;
 *   validate: (config: IRedisProviderConfig) => boolean;
 * }
 *
 * export interface IProviderCluster extends IProviderInMemory {
 *   getClient: (config: InMemoryProviderConfig) => Cluster | undefined;
 *   getConfig: (
 *     envOptions?: any,
 *     options?: IProviderClusterConfigOptions
 *   ) => InMemoryProviderConfig;
 *   validate: (config: InMemoryProviderConfig) => boolean;
 * }
 *
 * export type IProviders = IProviderRedis | IProviderCluster;
 *
 * const LOG_CONTEXT = 'InMemoryProviderService/Providers';
 *
 * const providers: Record<InMemoryProviderEnum, IProviders> = {
 *   [InMemoryProviderEnum.AZURE_CACHE_FOR_REDIS]: {
 *     getClient: getAzureCacheForRedisCluster,
 *     getConfig: getAzureCacheForRedisClusterProviderConfig,
 *     isClientReady: isAzureCacheForRedisClientReady,
 *     isCluster: true,
 *     provider: InMemoryProviderEnum.AZURE_CACHE_FOR_REDIS,
 *     validate: validateAzureCacheForRedisClusterProviderConfig,
 *   },
 *   [InMemoryProviderEnum.ELASTICACHE]: {
 *     getClient: getElasticacheCluster,
 *     getConfig: getElasticacheClusterProviderConfig,
 *     isClientReady: isElasticacheClientReady,
 *     isCluster: true,
 *     provider: InMemoryProviderEnum.ELASTICACHE,
 *     validate: validateElasticacheClusterProviderConfig,
 *   },
 *   [InMemoryProviderEnum.MEMORY_DB]: {
 *     getClient: getMemoryDbCluster,
 *     getConfig: getMemoryDbClusterProviderConfig,
 *     isClientReady: isMemoryDbClientReady,
 *     isCluster: true,
 *     provider: InMemoryProviderEnum.MEMORY_DB,
 *     validate: validateMemoryDbClusterProviderConfig,
 *   },
 *   [InMemoryProviderEnum.REDIS]: {
 *     getClient: getRedisInstance,
 *     getConfig: getRedisProviderConfig,
 *     isClientReady: isRedisClientReady,
 *     isCluster: false,
 *     provider: InMemoryProviderEnum.REDIS,
 *     validate: validateRedisProviderConfig,
 *   },
 *   [InMemoryProviderEnum.REDIS_CLUSTER]: {
 *     getClient: getRedisCluster,
 *     getConfig: getRedisClusterProviderConfig,
 *     isClientReady: isRedisClusterClientReady,
 *     isCluster: true,
 *     provider: InMemoryProviderEnum.REDIS_CLUSTER,
 *     validate: validateRedisClusterProviderConfig,
 *   },
 * };
 *
 * export const getProvider = <T>(providerId: InMemoryProviderEnum): T => {
 *   return providers[providerId] as T;
 * };
 *
 * export const getSingleInstanceProvider = (): IProviderRedis => {
 *   return getProvider<IProviderRedis>(InMemoryProviderEnum.REDIS);
 * };
 *
 * export const getClusterProvider = (
 *   providerId: InMemoryProviderEnum
 * ): IProviderCluster => {
 *   if (providerId === InMemoryProviderEnum.REDIS) {
 *     const message = `Provider ${providerId} is not available in Cluster Mode`;
 *     Logger.error(message, LOG_CONTEXT);
 *     throw new PlatformException(message);
 *   }
 *
 *   return getProvider<IProviderCluster>(providerId);
 * };
 */

import { IAzureCacheForRedisClusterProviderConfig } from './azure-cache-for-redis-cluster-provider';
import { InMemoryProviderEnum } from '../shared/types';
import { IElasticacheClusterProviderConfig } from './elasticache-cluster-provider';
import { IMemoryDbClusterProviderConfig } from './memory-db-cluster-provider';
import { IRedisProviderConfig } from './redis-provider';
import { IRedisClusterProviderConfig } from './redis-cluster-provider';

export type InMemoryProviderConfig =
  | IAzureCacheForRedisClusterProviderConfig
  | IElasticacheClusterProviderConfig
  | IMemoryDbClusterProviderConfig
  | IRedisProviderConfig
  | IRedisClusterProviderConfig;

export const isProviderAllowed = (providerId: string): boolean => {
  const values = Object.values(InMemoryProviderEnum);

  return values.includes(providerId as unknown as InMemoryProviderEnum);
};

export const isClusterProvider = (providerId: string): boolean => {
  const clusterIds = [
    InMemoryProviderEnum.REDIS_CLUSTER,
    InMemoryProviderEnum.MEMORY_DB,
    InMemoryProviderEnum.ELASTICACHE,
    InMemoryProviderEnum.AZURE_CACHE_FOR_REDIS,
  ];

  return clusterIds.includes(providerId as unknown as InMemoryProviderEnum);
};

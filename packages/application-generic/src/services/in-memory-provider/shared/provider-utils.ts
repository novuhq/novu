import { InMemoryProviderEnum } from './types';

export const isInMemoryProvider = (
  providerId: string
): providerId is InMemoryProviderEnum => {
  const values = Object.values(InMemoryProviderEnum);

  return values.includes(providerId as unknown as InMemoryProviderEnum);
};

export const isClusterProvider = (providerId: string): boolean => {
  const clusterIds = [
    InMemoryProviderEnum.REDIS_CLUSTER,
    InMemoryProviderEnum.MEMORY_DB,
    InMemoryProviderEnum.ELASTI_CACHE,
    InMemoryProviderEnum.AZURE_CACHE_FOR_REDIS,
  ];

  return clusterIds.includes(providerId as unknown as InMemoryProviderEnum);
};

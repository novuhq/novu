import { InMemoryLRUCacheService, InMemoryLRUCacheStore } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';

/**
 * The full environment document through the in-memory LRU cache (gated by
 * `IS_LRU_CACHE_ENABLED`, one-minute TTL). Every worker reader shares the same
 * entry, so a step reads the environment at most once per minute per worker.
 * Encrypted API keys stay encrypted in the cache; callers decrypt on use.
 */
export function getCachedEnvironment(
  inMemoryLRUCacheService: InMemoryLRUCacheService,
  environmentRepository: EnvironmentRepository,
  { environmentId, organizationId }: { environmentId: string; organizationId: string }
): Promise<EnvironmentEntity | null> {
  return inMemoryLRUCacheService.get(
    InMemoryLRUCacheStore.ENVIRONMENT,
    `${organizationId}:${environmentId}`,
    () => environmentRepository.findByIdAndOrganization(environmentId, organizationId),
    {
      environmentId,
      organizationId,
      cacheVariant: 'full',
    }
  );
}

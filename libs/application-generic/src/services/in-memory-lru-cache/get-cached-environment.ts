import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { InMemoryLRUCacheService } from './in-memory-lru-cache.service';
import { InMemoryLRUCacheStore } from './in-memory-lru-cache.store';

/**
 * The full environment document through the in-memory LRU cache (gated by
 * `IS_LRU_CACHE_ENABLED`, one-minute TTL). Every reader in a process shares the same
 * entry, so the environment is read at most once per minute per process.
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

import { Logger } from '@nestjs/common';
import { InMemoryLRUCacheService, InMemoryLRUCacheStore, resolveEnvironmentVariables } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentVariableRepository } from '@novu/dal';
import { EnvironmentSystemVariables } from '@novu/shared';

export type WorkflowEnvVariables = EnvironmentSystemVariables & Record<string, string>;

/**
 * The environment's variables through the in-memory LRU cache, keyed by whether
 * secrets are resolved or masked. Every worker reader shares the same entry.
 * Falls back to an empty object when the lookup fails.
 */
export function getCachedEnvironmentVariables(
  inMemoryLRUCacheService: InMemoryLRUCacheService,
  environmentVariableRepository: EnvironmentVariableRepository,
  {
    environmentId,
    organizationId,
    includeSecrets,
  }: { environmentId: string; organizationId: string; includeSecrets: boolean }
): Promise<Record<string, string>> {
  const cacheKey = `${organizationId}:${environmentId}:${includeSecrets ? 'full' : 'masked'}`;

  return inMemoryLRUCacheService.get(
    InMemoryLRUCacheStore.ENVIRONMENT_VARIABLES,
    cacheKey,
    async () => {
      try {
        const rawEnvVars = await environmentVariableRepository.findByEnvironment(organizationId, environmentId);

        return resolveEnvironmentVariables(rawEnvVars, { includeSecrets });
      } catch (error) {
        Logger.warn(
          { err: error, organizationId, environmentId },
          'Failed to fetch environment variables, falling back to empty object'
        );

        return {};
      }
    },
    {
      environmentId,
      organizationId,
    }
  );
}

/**
 * The `env` the workflow sees: the environment's variables, with the system
 * variables (`name`, `type`) taking precedence.
 */
export function buildWorkflowEnvVariables(
  envVars: Record<string, string>,
  environment: EnvironmentEntity
): WorkflowEnvVariables {
  // Compile-safe: adding a required field to EnvironmentSystemVariables will cause a TS error here
  const environmentSystemVars: EnvironmentSystemVariables = {
    name: environment.name,
    type: environment.type,
  };

  return {
    ...envVars,
    ...environmentSystemVars,
  };
}

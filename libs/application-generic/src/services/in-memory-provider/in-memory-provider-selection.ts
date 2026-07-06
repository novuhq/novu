import { InMemoryProviderEnum } from './types';
import { isClusterModeEnabled } from './utils';

/**
 * Novu ships in three deployment modes:
 * - Cloud: `IS_SELF_HOSTED` is not `'true'`.
 * - Self-hosted Enterprise: `IS_SELF_HOSTED='true'` and `NOVU_ENTERPRISE='true'`.
 * - Community (self-hosted): `IS_SELF_HOSTED='true'` and `NOVU_ENTERPRISE` is anything else.
 *
 * MemoryDB and ElastiCache are managed backends only available to Cloud and
 * self-hosted Enterprise. Community is always restricted to single-node Redis.
 */
export enum InMemoryProviderConsumer {
  WORKFLOW = 'workflow',
  CACHE = 'cache',
  WEB_SOCKETS = 'web_sockets',
}

export function isNovuCloud(env: Record<string, string | undefined>): boolean {
  return env.IS_SELF_HOSTED !== 'true';
}

export function isSelfHostedEnterprise(env: Record<string, string | undefined>): boolean {
  return env.IS_SELF_HOSTED === 'true' && env.NOVU_ENTERPRISE === 'true';
}

export function canUseMemoryDbOrElasticache(env: Record<string, string | undefined>): boolean {
  return isNovuCloud(env) || isSelfHostedEnterprise(env);
}

export function getWorkflowInMemoryProvider(env: Record<string, string | undefined>): InMemoryProviderEnum {
  if (
    isSelfHostedEnterprise(env) &&
    env.MEMORY_DB_CLUSTER_SERVICE_HOST &&
    env.MEMORY_DB_CLUSTER_SERVICE_PORT
  ) {
    return InMemoryProviderEnum.MEMORY_DB;
  }

  if (isNovuCloud(env)) {
    return InMemoryProviderEnum.MEMORY_DB;
  }

  return InMemoryProviderEnum.REDIS;
}

export function getCacheInMemoryProvider(env: Record<string, string | undefined>): InMemoryProviderEnum {
  if (!canUseMemoryDbOrElasticache(env)) {
    return InMemoryProviderEnum.REDIS;
  }

  if (isSelfHostedEnterprise(env)) {
    if (hasElasticacheConfigured(env)) {
      return InMemoryProviderEnum.ELASTICACHE;
    }

    return InMemoryProviderEnum.REDIS_MASTER_SLAVE;
  }

  return InMemoryProviderEnum.ELASTICACHE;
}

export function getWebSocketsInMemoryProvider(env: Record<string, string | undefined>): InMemoryProviderEnum {
  if (!canUseMemoryDbOrElasticache(env)) {
    return InMemoryProviderEnum.REDIS;
  }

  return InMemoryProviderEnum.ELASTICACHE;
}

function hasElasticacheConfigured(env: Record<string, string | undefined>): boolean {
  return !!env.ELASTICACHE_CLUSTER_SERVICE_HOST && !!env.ELASTICACHE_CLUSTER_SERVICE_PORT;
}

function getInMemoryProviderForConsumer(
  env: Record<string, string | undefined>,
  consumer: InMemoryProviderConsumer
): InMemoryProviderEnum {
  switch (consumer) {
    case InMemoryProviderConsumer.WORKFLOW:
      return getWorkflowInMemoryProvider(env);
    case InMemoryProviderConsumer.CACHE:
      return getCacheInMemoryProvider(env);
    case InMemoryProviderConsumer.WEB_SOCKETS:
      return getWebSocketsInMemoryProvider(env);
    default: {
      const exhaustiveCheck: never = consumer;

      return exhaustiveCheck;
    }
  }
}

/**
 * When cluster mode is disabled, InMemoryProviderService always falls back to
 * single-node Redis, so REDIS_HOST/REDIS_PORT must be provided regardless of consumer.
 */
export function isSingleNodeRedisHostPortRequired(
  env: Record<string, string | undefined>,
  consumers: InMemoryProviderConsumer | InMemoryProviderConsumer[]
): boolean {
  if (!isClusterModeEnabled(env)) {
    return true;
  }

  const consumerList = Array.isArray(consumers) ? consumers : [consumers];

  return consumerList.some(
    (consumer) => getInMemoryProviderForConsumer(env, consumer) === InMemoryProviderEnum.REDIS
  );
}

import { port, str, ValidatorSpec } from 'envalid';

import { InMemoryProviderConsumer, isSingleNodeRedisHostPortRequired } from './in-memory-provider-selection';

export function getRedisHostPortEnvValidators(
  env: Record<string, string | undefined>,
  consumers: InMemoryProviderConsumer | InMemoryProviderConsumer[]
): {
  REDIS_HOST: ValidatorSpec<string | undefined>;
  REDIS_PORT: ValidatorSpec<number | undefined>;
} {
  const required = isSingleNodeRedisHostPortRequired(env, consumers);

  return {
    REDIS_HOST: required ? str() : str({ default: undefined }),
    REDIS_PORT: required ? port() : port({ default: undefined }),
  };
}

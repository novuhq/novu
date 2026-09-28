import { expect } from 'chai';
import { cleanEnv } from 'envalid';

import { createEnvValidators } from './env.validators';

const CLUSTER_FLAGS = ['IS_IN_MEMORY_CLUSTER_MODE_ENABLED', 'IN_MEMORY_CLUSTER_MODE_ENABLED'] as const;

function withClusterFlags(
  values: Partial<Record<(typeof CLUSTER_FLAGS)[number], string | undefined>>,
  run: () => void
) {
  const previous = new Map<string, string | undefined>();

  for (const key of CLUSTER_FLAGS) {
    previous.set(key, process.env[key]);

    const value = values[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function cleanRedisEnv(env: Record<string, string | undefined>) {
  return cleanEnv(env, createEnvValidators(), {
    reporter: ({ errors }) => {
      const problems = Object.entries(errors);

      if (problems.length === 0) {
        return;
      }

      throw new Error(problems.map(([key]) => key).join(','));
    },
  });
}

describe('inbound-mail env validators', () => {
  it('should not require REDIS_HOST when only IN_MEMORY_CLUSTER_MODE_ENABLED is set', () => {
    withClusterFlags({ IS_IN_MEMORY_CLUSTER_MODE_ENABLED: undefined, IN_MEMORY_CLUSTER_MODE_ENABLED: 'true' }, () => {
      const env = cleanRedisEnv({
        IN_MEMORY_CLUSTER_MODE_ENABLED: 'true',
        REDIS_CLUSTER_SERVICE_HOST: 'redis.internal',
        REDIS_CLUSTER_SERVICE_PORTS: '[6379]',
      });

      expect(env.REDIS_CLUSTER_SERVICE_HOST).to.equal('redis.internal');
      expect(env.REDIS_CLUSTER_SERVICE_PORTS).to.equal('[6379]');
    });
  });

  it('should keep the cluster host validator when cluster mode is on', () => {
    withClusterFlags({ IS_IN_MEMORY_CLUSTER_MODE_ENABLED: 'true', IN_MEMORY_CLUSTER_MODE_ENABLED: undefined }, () => {
      const env = cleanRedisEnv({
        IS_IN_MEMORY_CLUSTER_MODE_ENABLED: 'true',
      });

      expect(env.REDIS_CLUSTER_SERVICE_HOST).to.equal('');
      expect(env.REDIS_CLUSTER_SERVICE_PORTS).to.equal('');
    });
  });

  it('should require REDIS_HOST when neither cluster flag is set', () => {
    withClusterFlags({ IS_IN_MEMORY_CLUSTER_MODE_ENABLED: 'false', IN_MEMORY_CLUSTER_MODE_ENABLED: 'false' }, () => {
      expect(() => cleanRedisEnv({})).to.throw('REDIS_HOST');
    });
  });
});

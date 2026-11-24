import path from 'node:path';
import { syncEnvReference } from '@novu/application-generic';
import { expect } from 'chai';
import { appEnvSchema, validateEnv } from './env';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

function setEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

/** The boot error with `values` set on top of the current environment, or '' when it boots. */
function bootError(values: Record<string, string | undefined>): string {
  const previous = Object.fromEntries(Object.keys(values).map((name) => [name, process.env[name]]));

  setEnv(values);

  try {
    validateEnv({ topics: [] });

    return '';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  } finally {
    setEnv(previous);
  }
}

describe('inbound-mail environment', () => {
  describe('BullMQ Redis at boot', () => {
    const noRedis = { REDIS_HOST: undefined, REDIS_PORT: undefined };

    it('does not require REDIS_HOST when only IN_MEMORY_CLUSTER_MODE_ENABLED is set', () => {
      const error = bootError({
        ...noRedis,
        QUEUE_BACKEND: 'bullmq',
        IS_IN_MEMORY_CLUSTER_MODE_ENABLED: undefined,
        IN_MEMORY_CLUSTER_MODE_ENABLED: 'true',
      });

      expect(error).not.to.contain('REDIS_HOST');
    });

    it('requires REDIS_HOST when neither cluster flag is set', () => {
      const error = bootError({
        ...noRedis,
        QUEUE_BACKEND: 'bullmq',
        IS_IN_MEMORY_CLUSTER_MODE_ENABLED: 'false',
        IN_MEMORY_CLUSTER_MODE_ENABLED: 'false',
      });

      expect(error).to.contain('REDIS_HOST: missing (required)');
    });

    it('does not require BullMQ Redis in SQS-only mode', () => {
      const error = bootError({ ...noRedis, QUEUE_BACKEND: 'sqs', IS_IN_MEMORY_CLUSTER_MODE_ENABLED: 'false' });

      expect(error).not.to.contain('REDIS_HOST');
    });
  });

  describe('REDIS_TLS at boot', () => {
    for (const value of [
      'true',
      'false',
      'FALSE',
      '0',
      '1',
      'no',
      'off',
      'yes',
      'on',
      '{"servername":"redis.internal"}',
    ]) {
      it(`accepts ${value}`, () => {
        expect(bootError({ REDIS_TLS: value })).not.to.contain('REDIS_TLS');
      });
    }

    it('rejects a typo', () => {
      expect(bootError({ REDIS_TLS: 'flase' })).to.contain('REDIS_TLS: invalid value');
    });
  });

  it('keeps apps/inbound-mail/ENVIRONMENT.md and every readBy current', () => {
    const { problems, upToDate } = syncEnvReference({
      repoRoot: REPO_ROOT,
      service: 'inbound-mail',
      appSchema: appEnvSchema,
      update: process.env.UPDATE_ENV_REFERENCE === 'true',
    });

    expect(problems).to.deep.equal([]);
    expect(
      upToDate,
      'apps/inbound-mail/ENVIRONMENT.md is stale: rerun this spec with UPDATE_ENV_REFERENCE=true'
    ).to.equal(true);
  });
});

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

describe('ws environment', () => {
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

  it('keeps apps/ws/ENVIRONMENT.md and every readBy current', () => {
    const { problems, upToDate } = syncEnvReference({
      repoRoot: REPO_ROOT,
      service: 'ws',
      appSchema: appEnvSchema,
      update: process.env.UPDATE_ENV_REFERENCE === 'true',
    });

    expect(problems).to.deep.equal([]);
    expect(upToDate, 'apps/ws/ENVIRONMENT.md is stale: rerun this spec with UPDATE_ENV_REFERENCE=true').to.equal(true);
  });
});

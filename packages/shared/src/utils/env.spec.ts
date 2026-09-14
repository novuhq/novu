import { afterEach, describe, expect, test } from 'vitest';
import { getEnvVariable, isOutboundSsrfProtectionEnabled } from './env';

const NOVU_ENTERPRISE_KEY = 'NOVU_ENTERPRISE';
const IS_SELF_HOSTED_KEY = 'IS_SELF_HOSTED';
const CI_EE_TEST_KEY = 'CI_EE_TEST';

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of [NOVU_ENTERPRISE_KEY, IS_SELF_HOSTED_KEY, CI_EE_TEST_KEY]) {
    previous[key] = process.env[key];
    const value = env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const key of [NOVU_ENTERPRISE_KEY, IS_SELF_HOSTED_KEY, CI_EE_TEST_KEY]) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe('isOutboundSsrfProtectionEnabled', () => {
  afterEach(() => {
    delete process.env[NOVU_ENTERPRISE_KEY];
    delete process.env[IS_SELF_HOSTED_KEY];
    delete process.env[CI_EE_TEST_KEY];
  });

  test('returns true for enterprise cloud', () => {
    withEnv({ [NOVU_ENTERPRISE_KEY]: 'true', [IS_SELF_HOSTED_KEY]: 'false' }, () => {
      expect(isOutboundSsrfProtectionEnabled()).toBe(true);
    });
  });

  test('returns false for community cloud', () => {
    withEnv({ [NOVU_ENTERPRISE_KEY]: 'false', [IS_SELF_HOSTED_KEY]: 'false' }, () => {
      expect(isOutboundSsrfProtectionEnabled()).toBe(false);
    });
  });

  test('returns false for enterprise self-hosted', () => {
    withEnv({ [NOVU_ENTERPRISE_KEY]: 'true', [IS_SELF_HOSTED_KEY]: 'true' }, () => {
      expect(isOutboundSsrfProtectionEnabled()).toBe(false);
    });
  });

  test('returns true when CI_EE_TEST is enabled on cloud', () => {
    withEnv({ [CI_EE_TEST_KEY]: 'true', [IS_SELF_HOSTED_KEY]: 'false' }, () => {
      expect(isOutboundSsrfProtectionEnabled()).toBe(true);
    });
  });

  test('returns false when CI_EE_TEST is enabled on self-hosted', () => {
    withEnv({ [CI_EE_TEST_KEY]: 'true', [IS_SELF_HOSTED_KEY]: 'true' }, () => {
      expect(isOutboundSsrfProtectionEnabled()).toBe(false);
    });
  });
});

describe('getEnvVariable', () => {
  const KEY = 'NOVU_TEST_ENV_VARIABLE';

  afterEach(() => {
    delete process.env[KEY];
  });

  test('returns the value of a defined process.env variable', () => {
    process.env[KEY] = 'the-value';
    expect(getEnvVariable(KEY)).toBe('the-value');
  });

  test('returns an empty string for a missing variable', () => {
    delete process.env[KEY];
    expect(getEnvVariable(KEY)).toBe('');
  });

  test('reads a string value from the context object when passed', () => {
    expect(getEnvVariable('FROM_CONTEXT', { FROM_CONTEXT: 'ctx-value' })).toBe('ctx-value');
  });
});

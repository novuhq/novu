import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resolveSafeProviderUrl } from './safe-provider-url';

const ORIGINAL_ENTERPRISE = process.env.NOVU_ENTERPRISE;
const ORIGINAL_SELF_HOSTED = process.env.IS_SELF_HOSTED;

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
}

describe('resolveSafeProviderUrl', () => {
  beforeEach(() => {
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_SELF_HOSTED = 'false';
  });

  afterEach(() => {
    restoreEnv('NOVU_ENTERPRISE', ORIGINAL_ENTERPRISE);
    restoreEnv('IS_SELF_HOSTED', ORIGINAL_SELF_HOSTED);
  });

  test.each(['http://127.0.0.1:3000', 'http://10.0.0.1', 'http://169.254.169.254/latest/meta-data'])(
    'blocks private target %s on Cloud',
    (url) => {
      expect(() => resolveSafeProviderUrl(url, { blockedPrefix: 'Provider URL blocked' })).toThrow(
        'Provider URL blocked'
      );
    }
  );

  test('allows a public provider URL on Cloud', () => {
    expect(
      resolveSafeProviderUrl('https://api.mailgun.net', {
        allowedHostnames: ['api.mailgun.net'],
        blockedPrefix: 'Provider URL blocked',
        requireHttps: true,
      })
    ).toBe('https://api.mailgun.net');
  });

  test('preserves private targets for self-hosted deployments', () => {
    process.env.IS_SELF_HOSTED = 'true';

    expect(resolveSafeProviderUrl('http://10.0.0.1', { blockedPrefix: 'Provider URL blocked' })).toBe(
      'http://10.0.0.1'
    );
  });
});

import { expect } from 'chai';
import sinon from 'sinon';

import {
  ConnectClaimTokenCacheUnavailableError,
  type ConnectClaimTokenService,
} from '../connect/services/connect-claim-token.service';
import { resolveKeylessAgentClaimUrl } from './keyless-agent-claim-url';

const MANAGED_ENV_KEYS = [
  'DASHBOARD_URL',
  'FRONT_BASE_URL',
  'HUMAN_DASHBOARD_URL',
  'KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS',
];

describe('resolveKeylessAgentClaimUrl', () => {
  const originalEnv: Record<string, string | undefined> = {};
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    for (const key of MANAGED_ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
    process.env.DASHBOARD_URL = 'https://dashboard.example.com/';
    process.env.HUMAN_DASHBOARD_URL = 'https://human.example.com';
    delete process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;
    clock = sinon.useFakeTimers(new Date('2026-10-14T12:00:00.000Z'));
  });

  afterEach(() => {
    clock.restore();
    for (const key of MANAGED_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  function makeTokenService(result: Promise<{ token: string; expiresAt: string }>) {
    const issueOrGetForEnvironment = sinon.stub().returns(result);

    return {
      service: { issueOrGetForEnvironment } as unknown as ConnectClaimTokenService,
      issueOrGetForEnvironment,
    };
  }

  it('returns a main-dashboard claim URL and the environment expiry, with the token TTL clamped to the expiry', async () => {
    const { service, issueOrGetForEnvironment } = makeTokenService(
      Promise.resolve({ token: 'abc123', expiresAt: '2026-10-21T12:00:00.000Z' })
    );

    const result = await resolveKeylessAgentClaimUrl(service, {
      environmentId: 'env-1',
      organizationId: 'org-keyless',
      createdAt: '2026-10-14T00:00:00.000Z',
    });

    expect(result).to.deep.equal({
      claimUrl: 'https://dashboard.example.com/connect/claim?token=abc123',
      expiresAt: '2026-10-17T00:00:00.000Z',
    });
    expect(issueOrGetForEnvironment.firstCall.args).to.deep.equal([
      { env: 'env-1', org: 'org-keyless' },
      { ttlSeconds: 60 * 60 * 60 },
    ]);
  });

  it('propagates cache-unavailable errors', async () => {
    const { service } = makeTokenService(Promise.reject(new ConnectClaimTokenCacheUnavailableError('issue')));

    try {
      await resolveKeylessAgentClaimUrl(service, {
        environmentId: 'env-1',
        organizationId: 'org-keyless',
        createdAt: new Date('2026-10-14T00:00:00.000Z'),
      });
      expect.fail('expected resolveKeylessAgentClaimUrl to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ConnectClaimTokenCacheUnavailableError);
    }
  });
});

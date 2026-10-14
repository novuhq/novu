import { createHash } from 'node:crypto';
import { expect } from 'chai';

import {
  resolveKeylessAgentEnvCreateCapPerIpPerDay,
  resolveKeylessAgentEnvCreateGlobalCapPerDay,
  resolveKeylessAgentTriggerCapPerEnvPerDay,
} from './keyless-abuse.constants';
import {
  getKeylessAgentClaimTokenTtlSeconds,
  getKeylessAgentEnvironmentExpiresAt,
  hashApiKey,
  isKeylessAgentEnvironment,
  isKeylessAgentEnvironmentExpired,
  isKeylessAgentEnvironmentsSupported,
  KEYLESS_AGENT_MAX_CLAIM_TOKEN_TTL_SECONDS,
  resolveKeylessAgentRetentionHours,
} from './keyless-agent-environment';

const MANAGED_ENV_KEYS = [
  'KEYLESS_ORGANIZATION_ID',
  'KEYLESS_USER_EMAIL',
  'KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS',
  'NOVU_ENTERPRISE',
  'CI_EE_TEST',
  'IS_SELF_HOSTED',
] as const;

describe('keyless-agent-environment', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of MANAGED_ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
    process.env.KEYLESS_ORGANIZATION_ID = 'org-keyless';
  });

  afterEach(() => {
    for (const key of MANAGED_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  describe('isKeylessAgentEnvironment', () => {
    const agentEnv = {
      _organizationId: 'org-keyless',
      identifier: 'Xk3m9QpL2aZt',
      name: 'Keyless Agent 2026-10-14T20:16:00.000Z',
    };

    it('is true for a non-prefixed, agent-named environment in the keyless organization', () => {
      expect(isKeylessAgentEnvironment(agentEnv)).to.equal(true);
    });

    it('is false outside the keyless organization', () => {
      expect(isKeylessAgentEnvironment({ ...agentEnv, _organizationId: 'org-other' })).to.equal(false);
    });

    it('is false for pk_keyless_ identifiers', () => {
      expect(isKeylessAgentEnvironment({ ...agentEnv, identifier: 'pk_keyless_abc_1234' })).to.equal(false);
    });

    it('is false without the agent name prefix', () => {
      expect(isKeylessAgentEnvironment({ ...agentEnv, name: 'Development' })).to.equal(false);
      expect(isKeylessAgentEnvironment({ ...agentEnv, name: 'Keyless 2026-10-14T20:16:00.000Z' })).to.equal(false);
    });

    it('is false when KEYLESS_ORGANIZATION_ID is unset', () => {
      delete process.env.KEYLESS_ORGANIZATION_ID;

      expect(isKeylessAgentEnvironment(agentEnv)).to.equal(false);
    });
  });

  describe('expiry', () => {
    const createdAt = new Date('2026-10-14T00:00:00.000Z');
    const hour = 60 * 60 * 1000;

    it('expires 72 hours after creation by default', () => {
      delete process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;

      expect(resolveKeylessAgentRetentionHours()).to.equal(72);
      expect(getKeylessAgentEnvironmentExpiresAt(createdAt).toISOString()).to.equal('2026-10-17T00:00:00.000Z');
      expect(getKeylessAgentEnvironmentExpiresAt(createdAt.toISOString()).toISOString()).to.equal(
        '2026-10-17T00:00:00.000Z'
      );
    });

    it('reads the retention from the environment at call time', () => {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '1';

      expect(getKeylessAgentEnvironmentExpiresAt(createdAt).toISOString()).to.equal('2026-10-14T01:00:00.000Z');
      expect(isKeylessAgentEnvironmentExpired(createdAt, new Date(createdAt.getTime() + 30 * 60 * 1000))).to.equal(
        false
      );
      expect(isKeylessAgentEnvironmentExpired(createdAt, new Date(createdAt.getTime() + hour))).to.equal(true);
    });

    it('treats a zero retention as expired immediately', () => {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '0';

      expect(isKeylessAgentEnvironmentExpired(createdAt, createdAt)).to.equal(true);
    });

    it('falls back to 72 hours for an invalid retention', () => {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = 'abc';

      expect(resolveKeylessAgentRetentionHours()).to.equal(72);
      expect(isKeylessAgentEnvironmentExpired(createdAt, new Date(createdAt.getTime() + 71 * hour))).to.equal(false);
    });

    it('uses the current time when no clock is given', () => {
      delete process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;

      expect(isKeylessAgentEnvironmentExpired(new Date())).to.equal(false);
      expect(isKeylessAgentEnvironmentExpired(new Date(Date.now() - 73 * hour))).to.equal(true);
    });
  });

  describe('getKeylessAgentClaimTokenTtlSeconds', () => {
    const createdAt = new Date('2026-10-14T00:00:00.000Z');

    it('is the time remaining until the environment expires', () => {
      delete process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;

      expect(getKeylessAgentClaimTokenTtlSeconds(createdAt, createdAt)).to.equal(72 * 60 * 60);
      expect(getKeylessAgentClaimTokenTtlSeconds(createdAt, new Date('2026-10-16T23:00:00.000Z'))).to.equal(60 * 60);
    });

    it('never exceeds the 7 day claim token maximum', () => {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = String(30 * 24);

      expect(KEYLESS_AGENT_MAX_CLAIM_TOKEN_TTL_SECONDS).to.equal(7 * 24 * 60 * 60);
      expect(getKeylessAgentClaimTokenTtlSeconds(createdAt, createdAt)).to.equal(
        KEYLESS_AGENT_MAX_CLAIM_TOKEN_TTL_SECONDS
      );
    });

    it('is at least 1 second, even after expiry', () => {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '0';

      expect(getKeylessAgentClaimTokenTtlSeconds(createdAt, new Date('2026-10-20T00:00:00.000Z'))).to.equal(1);
    });
  });

  describe('isKeylessAgentEnvironmentsSupported', () => {
    beforeEach(() => {
      process.env.NOVU_ENTERPRISE = 'true';
      delete process.env.CI_EE_TEST;
      delete process.env.IS_SELF_HOSTED;
      process.env.KEYLESS_USER_EMAIL = 'keyless@example.com';
    });

    it('is true on an enterprise cloud deployment with a keyless org and user', () => {
      expect(isKeylessAgentEnvironmentsSupported()).to.equal(true);
    });

    it('accepts CI_EE_TEST in place of NOVU_ENTERPRISE', () => {
      delete process.env.NOVU_ENTERPRISE;
      process.env.CI_EE_TEST = 'true';

      expect(isKeylessAgentEnvironmentsSupported()).to.equal(true);
    });

    it('is false on the community edition', () => {
      process.env.NOVU_ENTERPRISE = 'false';

      expect(isKeylessAgentEnvironmentsSupported()).to.equal(false);
    });

    it('is false when self-hosted', () => {
      process.env.IS_SELF_HOSTED = 'true';

      expect(isKeylessAgentEnvironmentsSupported()).to.equal(false);
    });

    it('is false without a keyless organization id', () => {
      delete process.env.KEYLESS_ORGANIZATION_ID;

      expect(isKeylessAgentEnvironmentsSupported()).to.equal(false);
    });

    it('is false without a keyless user email', () => {
      delete process.env.KEYLESS_USER_EMAIL;

      expect(isKeylessAgentEnvironmentsSupported()).to.equal(false);
    });
  });

  describe('agent cap resolvers', () => {
    const capEnvKeys = [
      'KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY',
      'KEYLESS_AGENT_ENV_CREATE_GLOBAL_CAP_PER_DAY',
      'KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY',
    ];
    const originalCaps: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const key of capEnvKeys) {
        originalCaps[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(() => {
      for (const key of capEnvKeys) {
        if (originalCaps[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalCaps[key];
        }
      }
    });

    it('uses the defaults when unset', () => {
      expect(resolveKeylessAgentEnvCreateCapPerIpPerDay()).to.equal(10);
      expect(resolveKeylessAgentEnvCreateGlobalCapPerDay()).to.equal(2000);
      expect(resolveKeylessAgentTriggerCapPerEnvPerDay()).to.equal(200);
    });

    it('reads overrides at call time', () => {
      process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY = '1';
      process.env.KEYLESS_AGENT_ENV_CREATE_GLOBAL_CAP_PER_DAY = '5';
      process.env.KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY = '0';

      expect(resolveKeylessAgentEnvCreateCapPerIpPerDay()).to.equal(1);
      expect(resolveKeylessAgentEnvCreateGlobalCapPerDay()).to.equal(5);
      expect(resolveKeylessAgentTriggerCapPerEnvPerDay()).to.equal(0);
    });
  });

  describe('hashApiKey', () => {
    it('is the sha256 hex digest used for stored api key hashes', () => {
      expect(hashApiKey('sk_test')).to.equal(createHash('sha256').update('sk_test').digest('hex'));
    });
  });
});

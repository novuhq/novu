import { HttpException, HttpStatus } from '@nestjs/common';
import { CacheService, FeatureFlagsService } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY,
  KEYLESS_GENERATE_CAP_PER_IP_PER_DAY,
  KEYLESS_MAX_AGENTS_PER_ENV,
} from './keyless-abuse.constants';
import { KeylessAbuseGuardService } from './keyless-abuse-guard.service';
import { KeylessAgentErrorCodeEnum } from './keyless-agent-environment';

describe('KeylessAbuseGuardService', () => {
  const keylessOrgId = 'keyless-org-id';
  const clientIp = '203.0.113.10';
  let cacheService: sinon.SinonStubbedInstance<CacheService>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let agentRepository: sinon.SinonStubbedInstance<AgentRepository>;
  let guard: KeylessAbuseGuardService;
  let previousKeylessOrgId: string | undefined;

  beforeEach(() => {
    previousKeylessOrgId = process.env.KEYLESS_ORGANIZATION_ID;
    process.env.KEYLESS_ORGANIZATION_ID = keylessOrgId;

    cacheService = sinon.createStubInstance(CacheService);
    cacheService.cacheEnabled.returns(true);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    agentRepository = sinon.createStubInstance(AgentRepository);

    guard = new KeylessAbuseGuardService(cacheService, featureFlagsService, agentRepository);
  });

  afterEach(() => {
    if (previousKeylessOrgId === undefined) {
      delete process.env.KEYLESS_ORGANIZATION_ID;
    } else {
      process.env.KEYLESS_ORGANIZATION_ID = previousKeylessOrgId;
    }

    sinon.restore();
  });

  it('allows env creation when the daily counter is below the cap', async () => {
    cacheService.eval.resolves(1);

    await guard.assertEnvCreationAllowed(clientIp);

    expect(cacheService.eval.calledOnce).to.be.true;
  });

  it('rejects env creation when the cap is exceeded', async () => {
    cacheService.eval.resolves(KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY + 1);

    try {
      await guard.assertEnvCreationAllowed(clientIp);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('rejects env creation when client IP is missing and cache is enabled', async () => {
    try {
      await guard.assertEnvCreationAllowed(undefined);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    }

    expect(cacheService.eval.called).to.be.false;
  });

  it('skips env caps when cache is disabled', async () => {
    cacheService.cacheEnabled.returns(false);

    await guard.assertEnvCreationAllowed(undefined);

    expect(cacheService.eval.called).to.be.false;
  });

  it('rejects generate when the per-IP daily cap is exceeded', async () => {
    cacheService.eval.resolves(KEYLESS_GENERATE_CAP_PER_IP_PER_DAY + 1);

    try {
      await guard.assertGenerateAllowed(clientIp);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('rejects generate when client IP is missing and cache is enabled', async () => {
    try {
      await guard.assertGenerateAllowed(undefined);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('rejects keyless AI when the kill-switch flag is disabled', async () => {
    featureFlagsService.getFlag.resolves(false);

    try {
      await guard.assertKeylessAiEnabled(keylessOrgId);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.SERVICE_UNAVAILABLE);
    }

    expect(featureFlagsService.getFlag.calledOnce).to.be.true;
    expect(featureFlagsService.getFlag.firstCall.args[0].key).to.equal(
      FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_AI_ENABLED
    );
  });

  it('does not gate non-keyless organizations for AI enablement', async () => {
    const enabled = await guard.isKeylessAgentAiEnabled('regular-org-id');

    expect(enabled).to.be.true;
    expect(featureFlagsService.getFlag.called).to.be.false;
  });

  it('rejects managed agent creation when the per-env cap is reached', async () => {
    agentRepository.count.resolves(KEYLESS_MAX_AGENTS_PER_ENV);

    try {
      await guard.assertManagedAgentCap('env-id', keylessOrgId);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('does not cap managed agents for non-keyless organizations', async () => {
    await guard.assertManagedAgentCap('env-id', 'regular-org-id');

    expect(agentRepository.count.called).to.be.false;
  });

  describe('assertAgentEnvCreationAllowed', () => {
    const CAP_ENV_KEYS = ['KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY', 'KEYLESS_AGENT_ENV_CREATE_GLOBAL_CAP_PER_DAY'];
    let originalCaps: Record<string, string | undefined>;

    const expectRejection = async (
      clientIp: string | undefined,
      status: HttpStatus,
      code: KeylessAgentErrorCodeEnum
    ): Promise<void> => {
      try {
        await guard.assertAgentEnvCreationAllowed(clientIp);
        expect.fail('Expected HttpException');
      } catch (error) {
        expect(error).to.be.instanceOf(HttpException);
        expect((error as HttpException).getStatus()).to.equal(status);
        expect((error as HttpException).getResponse()).to.include({ statusCode: status, code });
      }
    };

    const counterKeys = () => cacheService.eval.getCalls().map((call) => call.args[1][0]);

    beforeEach(() => {
      originalCaps = Object.fromEntries(CAP_ENV_KEYS.map((key) => [key, process.env[key]]));
      process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY = '2';
      process.env.KEYLESS_AGENT_ENV_CREATE_GLOBAL_CAP_PER_DAY = '5';
    });

    afterEach(() => {
      for (const key of CAP_ENV_KEYS) {
        if (originalCaps[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalCaps[key];
        }
      }
    });

    it('increments the per-IP and global counters when under both caps', async () => {
      cacheService.eval.resolves(1);

      await guard.assertAgentEnvCreationAllowed(clientIp);

      const date = new Date().toISOString().slice(0, 10);
      expect(counterKeys()).to.deep.equal([
        `keyless:agent_env_create:${date}:${clientIp}`,
        `keyless:agent_env_create:${date}:global`,
      ]);
    });

    it('fails closed with 503 keyless_unavailable when the cache is disabled', async () => {
      cacheService.cacheEnabled.returns(false);

      await expectRejection(clientIp, HttpStatus.SERVICE_UNAVAILABLE, KeylessAgentErrorCodeEnum.UNAVAILABLE);
      expect(cacheService.eval.called).to.be.false;
    });

    it('fails closed with 503 keyless_unavailable when Redis errors', async () => {
      cacheService.eval.rejects(new Error('redis down'));

      await expectRejection(clientIp, HttpStatus.SERVICE_UNAVAILABLE, KeylessAgentErrorCodeEnum.UNAVAILABLE);
    });

    it('rejects a missing client IP with 429 keyless_rate_limited', async () => {
      await expectRejection(undefined, HttpStatus.TOO_MANY_REQUESTS, KeylessAgentErrorCodeEnum.RATE_LIMITED);
      expect(cacheService.eval.called).to.be.false;
    });

    it('rejects with 429 keyless_rate_limited past the per-IP cap without touching the global counter', async () => {
      cacheService.eval.resolves(3);

      await expectRejection(clientIp, HttpStatus.TOO_MANY_REQUESTS, KeylessAgentErrorCodeEnum.RATE_LIMITED);
      expect(counterKeys()).to.have.length(1);
      expect(counterKeys()[0]).to.contain(clientIp);
    });

    it('rejects with 503 keyless_capacity_reached past the global cap', async () => {
      cacheService.eval.onFirstCall().resolves(1);
      cacheService.eval.onSecondCall().resolves(6);

      await expectRejection(clientIp, HttpStatus.SERVICE_UNAVAILABLE, KeylessAgentErrorCodeEnum.CAPACITY_REACHED);
    });

    it('reads the caps at call time', async () => {
      process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY = '10';
      cacheService.eval.resolves(3);

      await guard.assertAgentEnvCreationAllowed(clientIp);

      expect(counterKeys()).to.have.length(2);
    });
  });
});

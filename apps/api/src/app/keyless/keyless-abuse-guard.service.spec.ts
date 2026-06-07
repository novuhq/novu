import { HttpException, HttpStatus } from '@nestjs/common';
import { CacheService, FeatureFlagsService } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { KEYLESS_ENVIRONMENT_PREFIX } from '../inbox/utils/keyless.constants';
import {
  KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY,
  KEYLESS_GENERATE_CAP_PER_IP_PER_DAY,
  KEYLESS_MAX_AGENTS_PER_ENV,
} from './keyless-abuse.constants';
import { KeylessAbuseGuardService } from './keyless-abuse-guard.service';

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

    const decision = await guard.reserveEnvCreation(clientIp);

    expect(decision).to.deep.equal({ action: 'create' });
    expect(cacheService.eval.calledOnce).to.be.true;
  });

  it('reuses the last valid keyless env when the env-create cap is exceeded', async () => {
    const timestampHex = Buffer.alloc(4);
    timestampHex.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
    const identifier = `${KEYLESS_ENVIRONMENT_PREFIX}${timestampHex.toString('hex')}_abcd`;

    cacheService.eval.resolves(KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY + 1);
    cacheService.get.resolves(identifier);

    const decision = await guard.reserveEnvCreation(clientIp);

    expect(decision).to.deep.equal({ action: 'reuse', applicationIdentifier: identifier });
  });

  it('rejects env creation when the cap is exceeded and no valid last env exists', async () => {
    cacheService.eval.resolves(KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY + 1);
    cacheService.get.resolves(null);

    try {
      await guard.reserveEnvCreation(clientIp);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('rejects env creation when client IP is missing and cache is enabled', async () => {
    try {
      await guard.reserveEnvCreation(undefined);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    }

    expect(cacheService.eval.called).to.be.false;
  });

  it('skips env caps when cache is disabled', async () => {
    cacheService.cacheEnabled.returns(false);

    const decision = await guard.reserveEnvCreation(undefined);

    expect(decision).to.deep.equal({ action: 'create' });
    expect(cacheService.eval.called).to.be.false;
  });

  it('persists the last env identifier after successful creation', async () => {
    const identifier = `${KEYLESS_ENVIRONMENT_PREFIX}deadbeef_abcd`;

    await guard.rememberLastEnv(clientIp, identifier);

    expect(cacheService.set.calledOnce).to.be.true;
    expect(cacheService.set.firstCall.args[0]).to.include(clientIp);
    expect(cacheService.set.firstCall.args[1]).to.equal(identifier);
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
    expect(featureFlagsService.getFlag.firstCall.args[0].key).to.equal(FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_AI_ENABLED);
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
});

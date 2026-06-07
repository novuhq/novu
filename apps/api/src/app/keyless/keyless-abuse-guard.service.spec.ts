import { HttpException, HttpStatus } from '@nestjs/common';
import { CacheService, FeatureFlagsService } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { ApiAuthSchemeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { KEYLESS_ENVIRONMENT_PREFIX } from '../inbox/utils/keyless.constants';
import { KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY, KEYLESS_GENERATE_CAP_PER_IP_PER_DAY } from './keyless-abuse.constants';
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
    cacheService.get.resolves('0');
    cacheService.eval.resolves(1);

    const decision = await guard.resolveEnvCreation(clientIp);

    expect(decision).to.deep.equal({ action: 'create' });
  });

  it('reuses the last valid keyless env when the env-create cap is exceeded', async () => {
    const timestampHex = Buffer.alloc(4);
    timestampHex.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
    const identifier = `${KEYLESS_ENVIRONMENT_PREFIX}${timestampHex.toString('hex')}_abcd`;

    cacheService.get.onFirstCall().resolves(String(KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY));
    cacheService.get.onSecondCall().resolves(identifier);

    const decision = await guard.resolveEnvCreation(clientIp);

    expect(decision).to.deep.equal({ action: 'reuse', applicationIdentifier: identifier });
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

  it('rejects keyless AI when the kill-switch flag is disabled', async () => {
    featureFlagsService.getFlag.resolves(false);

    try {
      await guard.assertKeylessAiEnabled(keylessOrgId);
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    }

    expect(featureFlagsService.getFlag.calledOnce).to.be.true;
    expect(featureFlagsService.getFlag.firstCall.args[0].key).to.equal(FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_AI_ENABLED);
  });

  it('does not gate non-keyless organizations for AI enablement', async () => {
    const enabled = await guard.isKeylessAgentAiEnabled('regular-org-id');

    expect(enabled).to.be.true;
    expect(featureFlagsService.getFlag.called).to.be.false;
  });

  it('treats keyless auth scheme as non-credential-access', () => {
    expect(guard.isKeylessAuthScheme(ApiAuthSchemeEnum.KEYLESS)).to.be.true;
    expect(guard.isKeylessAuthScheme(ApiAuthSchemeEnum.API_KEY)).to.be.false;
  });
});

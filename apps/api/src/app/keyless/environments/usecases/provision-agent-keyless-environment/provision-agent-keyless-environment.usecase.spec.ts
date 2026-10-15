import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { AnalyticsService, CacheService, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  ConnectClaimTokenCacheUnavailableError,
  ConnectClaimTokenService,
} from '../../../../connect/services/connect-claim-token.service';
import { KeylessEnvironmentPurposeEnum } from '../../../../inbox/usecases/create-keyless-environment/create-keyless-environment.command';
import { CreateKeylessEnvironment } from '../../../../inbox/usecases/create-keyless-environment/create-keyless-environment.usecase';
import { KeylessAbuseGuardService } from '../../../keyless-abuse-guard.service';
import { KeylessAgentErrorCodeEnum } from '../../../keyless-agent-environment';
import { ProvisionAgentKeylessEnvironmentCommand } from './provision-agent-keyless-environment.command';
import { ProvisionAgentKeylessEnvironment } from './provision-agent-keyless-environment.usecase';

const ENV_KEYS = [
  'NOVU_ENTERPRISE',
  'CI_EE_TEST',
  'IS_SELF_HOSTED',
  'KEYLESS_ORGANIZATION_ID',
  'KEYLESS_USER_EMAIL',
  'API_ROOT_URL',
  'DASHBOARD_URL',
  'KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS',
];

describe('ProvisionAgentKeylessEnvironment', () => {
  const createdAt = new Date('2026-10-14T20:00:00.000Z');
  const environment = {
    _id: 'env-id',
    _organizationId: 'keyless-org-id',
    identifier: 'Xk3m9QpL2aZt',
    createdAt: createdAt.toISOString(),
  };
  let originalEnv: Record<string, string | undefined>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let cacheService: sinon.SinonStubbedInstance<CacheService>;
  let abuseGuard: sinon.SinonStubbedInstance<KeylessAbuseGuardService>;
  let createKeylessEnvironment: sinon.SinonStubbedInstance<CreateKeylessEnvironment>;
  let claimTokenService: sinon.SinonStubbedInstance<ConnectClaimTokenService>;
  let analyticsService: sinon.SinonStubbedInstance<AnalyticsService>;
  let organizationRepository: sinon.SinonStubbedInstance<CommunityOrganizationRepository>;
  let usecase: ProvisionAgentKeylessEnvironment;

  const execute = (input: Partial<ProvisionAgentKeylessEnvironmentCommand> = {}) =>
    usecase.execute(
      ProvisionAgentKeylessEnvironmentCommand.create({ clientIp: '203.0.113.5', userAgent: 'curl/8', ...input })
    );

  const expectHttpError = async (status: HttpStatus, code: KeylessAgentErrorCodeEnum) => {
    try {
      await execute();
      expect.fail('Expected HttpException');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(status);
      expect((error as HttpException).getResponse()).to.include({ code });
    }
  };

  const expectDisabledWithoutSideEffects = async () => {
    await expectHttpError(HttpStatus.NOT_FOUND, KeylessAgentErrorCodeEnum.DISABLED);
    expect(abuseGuard.assertAgentEnvCreationAllowed.called).to.be.false;
    expect(createKeylessEnvironment.execute.called).to.be.false;
  };

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.CI_EE_TEST;
    delete process.env.IS_SELF_HOSTED;
    delete process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless-org-id';
    process.env.KEYLESS_USER_EMAIL = 'keyless@example.com';
    process.env.API_ROOT_URL = 'https://api.example.com/';
    process.env.DASHBOARD_URL = 'https://dashboard.example.com';

    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    cacheService = sinon.createStubInstance(CacheService);
    abuseGuard = sinon.createStubInstance(KeylessAbuseGuardService);
    createKeylessEnvironment = sinon.createStubInstance(CreateKeylessEnvironment);
    claimTokenService = sinon.createStubInstance(ConnectClaimTokenService);
    analyticsService = sinon.createStubInstance(AnalyticsService);
    organizationRepository = sinon.createStubInstance(CommunityOrganizationRepository);

    featureFlagsService.getFlag.resolves(true);
    cacheService.cacheEnabled.returns(true);
    organizationRepository.findById.resolves({ _id: 'keyless-org-id' } as any);
    createKeylessEnvironment.execute.resolves({ environment: environment as any, secretKey: 'sk_plain' });
    claimTokenService.issueOrGetForEnvironment.resolves({ token: 'nvct_token' } as any);

    usecase = new ProvisionAgentKeylessEnvironment(
      featureFlagsService as any,
      cacheService as any,
      abuseGuard as any,
      createKeylessEnvironment as any,
      claimTokenService as any,
      analyticsService as any,
      organizationRepository as any,
      sinon.createStubInstance(PinoLogger) as any
    );
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }

    sinon.restore();
  });

  it('returns the secret key, identifiers, API URL, claim URL and expiry for a new agent environment', async () => {
    const response = await execute({ source: 'cursor' });

    expect(createKeylessEnvironment.execute.firstCall.args[0].purpose).to.equal(KeylessEnvironmentPurposeEnum.AGENT);
    expect(response).to.deep.equal({
      environmentId: 'env-id',
      secretKey: 'sk_plain',
      applicationIdentifier: 'Xk3m9QpL2aZt',
      apiUrl: 'https://api.example.com',
      claimUrl: 'https://dashboard.example.com/connect/claim?token=nvct_token',
      expiresAt: '2026-10-17T20:00:00.000Z',
    });
    expect(abuseGuard.assertAgentEnvCreationAllowed.calledOnceWith('203.0.113.5')).to.be.true;
  });

  it('falls back to the public API URL when API_ROOT_URL is unset', async () => {
    delete process.env.API_ROOT_URL;

    const response = await execute();

    expect(response.apiUrl).to.equal('https://api.novu.co');
  });

  it('stores the client and tracks Signup Started with source agent, defaulting the client to unknown', async () => {
    await execute();

    expect(cacheService.set.calledOnce).to.be.true;
    expect(cacheService.set.firstCall.args[0]).to.equal('keyless_agent_source:{env-id}');
    expect(cacheService.set.firstCall.args[1]).to.equal('unknown');
    expect(cacheService.set.firstCall.args[2]).to.deep.equal({ ttl: 72 * 60 * 60 });

    expect(analyticsService.track.called).to.be.false;
    expect(analyticsService.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsService.mixpanelTrack.firstCall.args).to.deep.equal([
      'Signup Started',
      'env-id',
      {
        source: 'agent',
        client: 'unknown',
        environmentId: 'env-id',
        userAgent: 'curl/8',
        expiresAt: '2026-10-17T20:00:00.000Z',
        createdAt: createdAt.toISOString(),
      },
    ]);
  });

  it('reports the requested source as the client of an agent signup', async () => {
    await execute({ source: 'claude-code' });

    expect(analyticsService.mixpanelTrack.firstCall.args[2]).to.include({ source: 'agent', client: 'claude-code' });
  });

  it('returns 404 keyless_disabled on community edition', async () => {
    delete process.env.NOVU_ENTERPRISE;

    await expectDisabledWithoutSideEffects();
  });

  it('returns 404 keyless_disabled on self-hosted', async () => {
    process.env.IS_SELF_HOSTED = 'true';

    await expectDisabledWithoutSideEffects();
  });

  it('returns 404 keyless_disabled when the keyless organization is not configured', async () => {
    delete process.env.KEYLESS_ORGANIZATION_ID;

    await expectDisabledWithoutSideEffects();
  });

  it('returns 404 keyless_disabled when the keyless organization does not exist', async () => {
    organizationRepository.findById.resolves(null);

    await expectDisabledWithoutSideEffects();
  });

  for (const flag of [
    FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_ENVIRONMENTS_ENABLED,
    FeatureFlagsKeysEnum.IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED,
  ]) {
    it(`returns 404 keyless_disabled when ${flag} is off`, async () => {
      featureFlagsService.getFlag.callsFake(async ({ key }) => key !== flag);

      await expectDisabledWithoutSideEffects();
    });
  }

  it('returns 503 keyless_unavailable when the claim token cannot be issued', async () => {
    claimTokenService.issueOrGetForEnvironment.rejects(new ConnectClaimTokenCacheUnavailableError('issue'));

    await expectHttpError(HttpStatus.SERVICE_UNAVAILABLE, KeylessAgentErrorCodeEnum.UNAVAILABLE);
    expect(analyticsService.mixpanelTrack.called).to.be.false;
  });

  it('does not create an environment when the abuse guard rejects', async () => {
    abuseGuard.assertAgentEnvCreationAllowed.rejects(new NotFoundException());

    try {
      await execute();
      expect.fail('Expected rejection');
    } catch {
      expect(createKeylessEnvironment.execute.called).to.be.false;
    }
  });
});

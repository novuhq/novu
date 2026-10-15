import { HttpException, HttpStatus } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';

import { ConnectClaimTokenService } from '../../../../connect/services/connect-claim-token.service';
import { KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX, KeylessAgentErrorCodeEnum } from '../../../keyless-agent-environment';
import { GetAgentKeylessEnvironmentCommand } from './get-agent-keyless-environment.command';
import { GetAgentKeylessEnvironment } from './get-agent-keyless-environment.usecase';

const ENV_KEYS = ['KEYLESS_ORGANIZATION_ID', 'DASHBOARD_URL', 'KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS'];

describe('GetAgentKeylessEnvironment', () => {
  const keylessOrgId = 'keyless-org-id';
  let originalEnv: Record<string, string | undefined>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let claimTokenService: sinon.SinonStubbedInstance<ConnectClaimTokenService>;
  let usecase: GetAgentKeylessEnvironment;

  const agentEnvironment = (overrides: Record<string, unknown> = {}) => ({
    _id: 'env-id',
    _organizationId: keylessOrgId,
    identifier: 'Xk3m9QpL2aZt',
    name: `${KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX}2026-10-14T20:00:00.000Z`,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    ...overrides,
  });

  const execute = () =>
    usecase.execute(
      GetAgentKeylessEnvironmentCommand.create({ environmentId: 'env-id', organizationId: keylessOrgId, userId: 'u' })
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

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    process.env.KEYLESS_ORGANIZATION_ID = keylessOrgId;
    process.env.DASHBOARD_URL = 'https://dashboard.example.com';
    delete process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;

    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    claimTokenService = sinon.createStubInstance(ConnectClaimTokenService);
    claimTokenService.issueOrGetForEnvironment.resolves({ token: 'nvct_token' } as any);

    usecase = new GetAgentKeylessEnvironment(environmentRepository as any, claimTokenService as any);
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

  it('returns the active status and a fresh claim URL for an agent environment', async () => {
    const environment = agentEnvironment();
    environmentRepository.findOne.resolves(environment as any);

    const response = await execute();

    expect(response).to.deep.include({
      environmentId: 'env-id',
      applicationIdentifier: 'Xk3m9QpL2aZt',
      status: 'active',
      claimUrl: 'https://dashboard.example.com/connect/claim?token=nvct_token',
    });
    expect(response.expiresAt).to.equal(
      new Date(new Date(environment.createdAt).getTime() + 72 * 60 * 60 * 1000).toISOString()
    );
  });

  it('returns 404 keyless_environment_not_found for a regular environment', async () => {
    environmentRepository.findOne.resolves(agentEnvironment({ name: 'Development' }) as any);

    await expectHttpError(HttpStatus.NOT_FOUND, KeylessAgentErrorCodeEnum.ENVIRONMENT_NOT_FOUND);
    expect(claimTokenService.issueOrGetForEnvironment.called).to.be.false;
  });

  it('returns 404 keyless_environment_not_found for an inbox demo environment', async () => {
    environmentRepository.findOne.resolves(agentEnvironment({ identifier: 'pk_keyless_abc_1234' }) as any);

    await expectHttpError(HttpStatus.NOT_FOUND, KeylessAgentErrorCodeEnum.ENVIRONMENT_NOT_FOUND);
  });

  it('returns 401 keyless_environment_expired once the retention window has passed', async () => {
    process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '0';
    environmentRepository.findOne.resolves(agentEnvironment() as any);

    await expectHttpError(HttpStatus.UNAUTHORIZED, KeylessAgentErrorCodeEnum.ENVIRONMENT_EXPIRED);
  });
});

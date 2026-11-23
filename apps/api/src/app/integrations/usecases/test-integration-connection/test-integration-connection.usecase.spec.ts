import { ChannelFactory, GetDecryptedIntegrations } from '@novu/application-generic';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  IntegrationConnectionStatusEnum,
  SmsProviderIdEnum,
} from '@novu/shared';
import { VerifyCredentialsStatusEnum } from '@novu/stateless';
import { expect } from 'chai';
import sinon from 'sinon';
import { TestIntegrationConnectionCommand } from './test-integration-connection.command';
import { TestIntegrationConnection } from './test-integration-connection.usecase';

const INTEGRATION_ID = '69f84d848bed9b0a73216d96';
const ENVIRONMENT_ID = '69f84d848bed9b0a73216d98';
const ORGANIZATION_ID = '69f84d848bed9b0a73216d99';

const { VALID, INVALID, UNREACHABLE, INCONCLUSIVE } = VerifyCredentialsStatusEnum;

function buildHarness(integration: Record<string, unknown> = {}) {
  const integrationRepository = {
    findOne: sinon.stub().resolves({
      _id: INTEGRATION_ID,
      _environmentId: ENVIRONMENT_ID,
      _organizationId: ORGANIZATION_ID,
      providerId: SmsProviderIdEnum.Twilio,
      channel: ChannelTypeEnum.SMS,
      credentials: { accountSid: 'AC123', token: 'secret' },
      ...integration,
    }),
  };
  const msTeamsTokenService = { verifyGraphCredentials: sinon.stub() };
  const integrationHealthService = { recordCheckResult: sinon.stub().resolves() };
  const logger = { setContext: sinon.stub(), info: sinon.stub(), warn: sinon.stub() };

  const usecase = new TestIntegrationConnection(
    integrationRepository as any,
    msTeamsTokenService as any,
    integrationHealthService as any,
    logger as any
  );

  return { usecase, integrationRepository, msTeamsTokenService, integrationHealthService };
}

const command = {
  integrationId: INTEGRATION_ID,
  environmentId: ENVIRONMENT_ID,
  organizationId: ORGANIZATION_ID,
} as TestIntegrationConnectionCommand;

/** Makes the provider answer with the given statuses, one per attempt. */
function stubProviderAnswers(...statuses: VerifyCredentialsStatusEnum[]) {
  const verifyCredentials = sinon.stub();
  statuses.forEach((status, index) => verifyCredentials.onCall(index).resolves({ status }));
  sinon.stub(ChannelFactory.prototype, 'getHandler').returns({ verifyCredentials } as any);

  return verifyCredentials;
}

describe('TestIntegrationConnection', () => {
  const originalDelays = TestIntegrationConnection.RETRY_DELAYS_MS;
  const originalTimeout = TestIntegrationConnection.ATTEMPT_TIMEOUT_MS;

  beforeEach(() => {
    TestIntegrationConnection.RETRY_DELAYS_MS = [0, 0];
    TestIntegrationConnection.ATTEMPT_TIMEOUT_MS = 50;
    sinon.stub(GetDecryptedIntegrations, 'getDecryptedCredentials').callsFake((integration) => integration);
  });

  afterEach(() => {
    TestIntegrationConnection.RETRY_DELAYS_MS = originalDelays;
    TestIntegrationConnection.ATTEMPT_TIMEOUT_MS = originalTimeout;
    sinon.restore();
  });

  it('scopes the lookup to the environment and organization', async () => {
    const { usecase, integrationRepository } = buildHarness();
    stubProviderAnswers(VALID);

    await usecase.execute(command);

    expect(integrationRepository.findOne.firstCall.args[0]).to.deep.equal({
      _id: INTEGRATION_ID,
      _environmentId: ENVIRONMENT_ID,
      _organizationId: ORGANIZATION_ID,
    });
  });

  it('passes the saved email sender to the handler', async () => {
    const { usecase } = buildHarness({
      providerId: EmailProviderIdEnum.Postmark,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: 'key', from: 'hello@example.com' },
    });
    stubProviderAnswers(VALID);

    await usecase.execute(command);

    const getHandler = ChannelFactory.prototype.getHandler as sinon.SinonStub;
    expect(getHandler.firstCall.args[2]).to.deep.equal({ from: 'hello@example.com' });
  });

  it('treats an attempt that exceeds the deadline as unreachable', async () => {
    const { usecase } = buildHarness();
    sinon
      .stub(ChannelFactory.prototype, 'getHandler')
      .returns({ verifyCredentials: () => new Promise(() => undefined) } as any);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.UNREACHABLE);
    expect(result.attempts).to.equal(3);
  });

  it('reports valid after one attempt', async () => {
    const { usecase, integrationHealthService } = buildHarness();
    const verify = stubProviderAnswers(VALID);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.VALID);
    expect(result.attempts).to.equal(1);
    expect(verify.callCount).to.equal(1);
    expect(integrationHealthService.recordCheckResult.calledOnce).to.equal(true);
    expect(integrationHealthService.recordCheckResult.firstCall.args[1]).to.equal(true);
  });

  it('reports invalid only after every attempt was rejected, and records it as the integration health', async () => {
    const { usecase, integrationHealthService } = buildHarness();
    const verify = stubProviderAnswers(INVALID, INVALID, INVALID);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.INVALID);
    expect(result.attempts).to.equal(3);
    expect(verify.callCount).to.equal(3);
    expect(integrationHealthService.recordCheckResult.firstCall.args[1]).to.equal(false);
  });

  it('recovers from a transient failure', async () => {
    const { usecase } = buildHarness();
    stubProviderAnswers(UNREACHABLE, VALID);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.VALID);
    expect(result.attempts).to.equal(2);
  });

  it('treats a mix of rejections and outages as unreachable, never invalid', async () => {
    const { usecase, integrationHealthService } = buildHarness();
    stubProviderAnswers(INVALID, UNREACHABLE, INVALID);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.UNREACHABLE);
    expect(integrationHealthService.recordCheckResult.called).to.equal(false);
  });

  it('stops retrying on an inconclusive answer', async () => {
    const { usecase } = buildHarness();
    const verify = stubProviderAnswers(INCONCLUSIVE);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.INCONCLUSIVE);
    expect(verify.callCount).to.equal(1);
  });

  it('reports unsupported when the provider has no check', async () => {
    const { usecase } = buildHarness();
    sinon
      .stub(ChannelFactory.prototype, 'getHandler')
      .returns({ verifyCredentials: sinon.stub().resolves(null) } as any);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.UNSUPPORTED);
    expect(result.attempts).to.equal(0);
  });

  it('treats a thrown check as unreachable', async () => {
    const { usecase } = buildHarness();
    sinon
      .stub(ChannelFactory.prototype, 'getHandler')
      .returns({ verifyCredentials: sinon.stub().rejects(new Error('socket hang up')) } as any);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.UNREACHABLE);
    expect(result.attempts).to.equal(3);
  });

  it('does not call the provider for Novu demo integrations', async () => {
    const { usecase } = buildHarness({ providerId: EmailProviderIdEnum.Novu, channel: ChannelTypeEnum.EMAIL });
    const getHandler = sinon.stub(ChannelFactory.prototype, 'getHandler');

    const result = await usecase.execute(command);

    expect(result.status).to.equal(IntegrationConnectionStatusEnum.UNSUPPORTED);
    expect(getHandler.called).to.equal(false);
  });

  it('throws when the integration is not in this environment', async () => {
    const { usecase, integrationRepository } = buildHarness();
    integrationRepository.findOne.resolves(null);

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error?.status).to.equal(404);
  });

  describe('MS Teams', () => {
    const msTeams = {
      providerId: ChatProviderIdEnum.MsTeams,
      channel: ChannelTypeEnum.CHAT,
      credentials: { clientId: 'client', secretKey: 'secret', tenantId: 'tenant' },
    };

    it('is valid when a fresh Graph token is issued', async () => {
      const { usecase, msTeamsTokenService } = buildHarness(msTeams);
      msTeamsTokenService.verifyGraphCredentials.resolves(true);

      const result = await usecase.execute(command);

      expect(result.status).to.equal(IntegrationConnectionStatusEnum.VALID);
    });

    it('is invalid when Azure AD rejects the client', async () => {
      const { usecase, msTeamsTokenService } = buildHarness(msTeams);
      msTeamsTokenService.verifyGraphCredentials.rejects(
        Object.assign(new Error('Request failed'), {
          isAxiosError: true,
          response: { status: 401, data: { error: 'invalid_client' } },
        })
      );

      const result = await usecase.execute(command);

      expect(result.status).to.equal(IntegrationConnectionStatusEnum.INVALID);
    });

    it('is unsupported for webhook-only integrations without bot credentials', async () => {
      const { usecase, msTeamsTokenService } = buildHarness({ ...msTeams, credentials: {} });

      const result = await usecase.execute(command);

      expect(result.status).to.equal(IntegrationConnectionStatusEnum.UNSUPPORTED);
      expect(msTeamsTokenService.verifyGraphCredentials.called).to.equal(false);
    });
  });
});

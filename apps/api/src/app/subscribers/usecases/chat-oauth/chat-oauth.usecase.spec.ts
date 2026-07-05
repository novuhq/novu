import { BadRequestException } from '@nestjs/common';
import { createHash, FeatureFlagsService } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatOauthCommand } from './chat-oauth.command';
import { ChatOauth } from './chat-oauth.usecase';

const MOCK_ENVIRONMENT_ID = '507f1f77bcf86cd799439011';
const MOCK_SUBSCRIBER_ID = 'subscriber-abc';
const MOCK_API_KEY = 'test-api-key';
const MOCK_CLIENT_ID = 'slack-client-id';

describe('ChatOauth', () => {
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let usecase: ChatOauth;

  beforeEach(() => {
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    usecase = new ChatOauth(
      integrationRepository as any,
      environmentRepository as any,
      featureFlagsService as any
    );

    integrationRepository.findOne.resolves({
      credentials: { clientId: MOCK_CLIENT_ID },
    } as any);
    environmentRepository.getApiKeys.resolves([{ key: MOCK_API_KEY }] as any);
    featureFlagsService.getFlag.resolves(true);
    process.env.API_ROOT_URL = 'https://api.novu.co';
  });

  it('should require HMAC hash when feature flag is enabled', async () => {
    featureFlagsService.getFlag.resolves(true);

    const command = ChatOauthCommand.create({
      environmentId: MOCK_ENVIRONMENT_ID,
      subscriberId: MOCK_SUBSCRIBER_ID,
      providerId: ChatProviderIdEnum.Slack,
    });

    try {
      await usecase.execute(command);
      throw new Error('expected HMAC validation to fail');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.equal('HMAC hash is required to initiate subscriber chat OAuth');
    }
  });

  it('should allow OAuth start without HMAC when feature flag is disabled', async () => {
    featureFlagsService.getFlag.resolves(false);

    const command = ChatOauthCommand.create({
      environmentId: MOCK_ENVIRONMENT_ID,
      subscriberId: MOCK_SUBSCRIBER_ID,
      providerId: ChatProviderIdEnum.Slack,
    });

    const url = await usecase.execute(command);

    expect(url).to.include('state=');
    expect(url).to.include(`client_id=${MOCK_CLIENT_ID}`);
  });

  it('should reject invalid HMAC hash when feature flag is enabled', async () => {
    featureFlagsService.getFlag.resolves(true);

    const command = ChatOauthCommand.create({
      environmentId: MOCK_ENVIRONMENT_ID,
      subscriberId: MOCK_SUBSCRIBER_ID,
      providerId: ChatProviderIdEnum.Slack,
      hmacHash: 'invalid-hmac',
    });

    try {
      await usecase.execute(command);
      throw new Error('expected HMAC validation to fail');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.equal('Invalid HMAC hash for subscriber chat OAuth');
    }
  });

  it('should include signed state in the OAuth URL', async () => {
    const hmacHash = createHash(MOCK_API_KEY, MOCK_SUBSCRIBER_ID)!;
    const command = ChatOauthCommand.create({
      environmentId: MOCK_ENVIRONMENT_ID,
      subscriberId: MOCK_SUBSCRIBER_ID,
      providerId: ChatProviderIdEnum.Slack,
      hmacHash,
    });

    const url = await usecase.execute(command);

    expect(url).to.include('state=');
    expect(url).to.include(`client_id=${MOCK_CLIENT_ID}`);
    expect(url).to.include('scope=incoming-webhook');
  });
});

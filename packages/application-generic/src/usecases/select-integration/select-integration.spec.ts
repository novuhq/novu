import { Test } from '@nestjs/testing';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import {
  IntegrationEntity,
  IntegrationRepository,
  MessageRepository,
  OrganizationRepository,
} from '@novu/dal';
import * as sinon from 'sinon';
import { UserSession } from '@novu/testing';
import { SelectIntegration } from './select-integration.usecase';
import { SelectIntegrationCommand } from './select-integration.command';
import { GetNovuIntegration } from '../get-novu-integration';
import { CalculateLimitNovuIntegration } from '../calculate-limit-novu-integration';
import { AnalyticsService } from '../../services';

describe('select integration', function () {
  let useCase: SelectIntegration;
  let integrationRepository: IntegrationRepository;
  let session: UserSession;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(async function () {
    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        GetNovuIntegration,
        CalculateLimitNovuIntegration,
        IntegrationRepository,
        OrganizationRepository,
        AnalyticsService,
        MessageRepository,
      ],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<SelectIntegration>(SelectIntegration);
    integrationRepository = moduleRef.get<IntegrationRepository>(
      IntegrationRepository
    );
  });

  it('should select the integration', async function () {
    const testIntegration: IntegrationEntity = {
      _environmentId: 'env-test-123',
      _id: 'integration-test-123',
      _organizationId: 'org-test-123',
      active: true,
      channel: ChannelTypeEnum.EMAIL,
      credentials: {
        apiKey: '123',
        user: 'test-user',
        secretKey: '123',
        domain: 'domain',
        password: '123',
        host: 'host',
        port: 'port',
        secure: true,
        region: 'region',
        accountSid: 'accountSid',
        messageProfileId: 'messageProfileId',
        token: '123',
        from: 'from',
        senderName: 'senderName',
        applicationId: 'applicationId',
        clientId: 'clientId',
        projectName: 'projectName',
      },
      providerId: 'test-provider-id',
      deleted: false,
      identifier: 'test-integration-identifier',
      name: 'test-integration-name',
      deletedAt: null,
      deletedBy: null,
    };

    sinon.stub(integrationRepository, 'findOne').resolves(testIntegration);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        userId: session.user._id,
      })
    );

    expect(integration).not.toBeNull();
    expect(integration?.identifier).toEqual(testIntegration.identifier);
  });

  it('should return the novu integration', async function () {
    sinon.stub(integrationRepository, 'findOne').resolves(null);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        userId: session.user._id,
      })
    );

    expect(integration).not.toBeNull();
    expect(integration?.providerId).toEqual(EmailProviderIdEnum.Novu);
  });
});

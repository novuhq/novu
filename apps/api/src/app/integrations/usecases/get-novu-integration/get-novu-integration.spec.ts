import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { AuthModule } from '../../../auth/auth.module';
import { MessageRepository, IntegrationRepository } from '@novu/dal';
import { SharedModule } from '../../../shared/shared.module';
import { IntegrationModule } from '../../integrations.module';
import { GetNovuIntegration } from './get-novu-integration.usecase';
import { GetNovuIntegrationCommand } from './get-novu-integration.command';
import { ChannelTypeEnum } from '../../../../../../../packages/stateless/src/lib/template/template.interface';
import { EmailProviderIdEnum } from '../../../../../../../libs/shared/src/consts/providers/provider.enum';
import { endOfMonth, startOfMonth } from 'date-fns';
import { CalculateLimitNovuIntegration } from '../calculate-limit-novu-integration/calculate-limit-novu-integration.usecase';

describe('Get Novu Integration', function () {
  let getNovuIntegration: GetNovuIntegration;
  let integrationRepository: IntegrationRepository;
  let messageRepository: MessageRepository;
  let session: UserSession;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, AuthModule, IntegrationModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize({
      noIntegrations: true,
    });
    getNovuIntegration = moduleRef.get<GetNovuIntegration>(GetNovuIntegration);
    integrationRepository = moduleRef.get<IntegrationRepository>(IntegrationRepository);
    messageRepository = moduleRef.get<MessageRepository>(MessageRepository);
  });

  it('should return Novu integration', async function () {
    const result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.EMAIL,
      })
    );

    expect(result?.providerId).to.equal(EmailProviderIdEnum.Novu);
  });

  it('should not return Novu integration for sms', async function () {
    const result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.SMS,
      })
    );

    expect(result).to.equal(undefined);
  });

  it('should not return Novu integration if there is active integrations', async function () {
    sinon.stub(integrationRepository, 'count').resolves(1);

    const result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.EMAIL,
      })
    );

    expect(result).to.equal(undefined);
  });

  it('should not return Novu integration if usage limit was met', async function () {
    sinon
      .stub(messageRepository, 'count')
      .resolves(CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_MAIL_REQUESTS - 1);

    let result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.EMAIL,
      })
    );

    expect(result).to.not.equal(undefined);

    sinon.restore();
    sinon.stub(messageRepository, 'count').resolves(CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_MAIL_REQUESTS);

    try {
      await getNovuIntegration.execute(
        GetNovuIntegrationCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          channelType: ChannelTypeEnum.EMAIL,
        })
      );
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.message).to.equal('Limit for Novus email provider was reached.');
    }

    sinon.restore();
    const stub = sinon
      .stub(messageRepository, 'count')
      .resolves(CalculateLimitNovuIntegration.MAX_NOVU_INTEGRATION_MAIL_REQUESTS + 1);

    try {
      await getNovuIntegration.execute(
        GetNovuIntegrationCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          channelType: ChannelTypeEnum.EMAIL,
        })
      );
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.message).to.equal('Limit for Novus email provider was reached.');
    }

    sinon.assert.calledWith(stub, {
      channel: ChannelTypeEnum.EMAIL,
      _organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.Novu,
      createdAt: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
    });
  });

  it('should map novu email to sendgrid', () => {
    let result = GetNovuIntegration.mapProviders(ChannelTypeEnum.SMS, EmailProviderIdEnum.Novu);
    expect(result).to.equal(EmailProviderIdEnum.Novu);

    result = GetNovuIntegration.mapProviders(ChannelTypeEnum.EMAIL, EmailProviderIdEnum.Novu);
    expect(result).to.equal(EmailProviderIdEnum.SendGrid);

    result = GetNovuIntegration.mapProviders(ChannelTypeEnum.EMAIL, EmailProviderIdEnum.CustomSMTP);
    expect(result).to.equal(EmailProviderIdEnum.CustomSMTP);
  });
});

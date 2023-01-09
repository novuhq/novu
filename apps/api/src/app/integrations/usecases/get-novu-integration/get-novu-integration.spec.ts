import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { AuthModule } from '../../../auth/auth.module';
import { MessageRepository, IntegrationRepository, ExecutionDetailsRepository } from '@novu/dal';
import { SharedModule } from '../../../shared/shared.module';
import { IntegrationModule } from '../../integrations.module';
import { GetNovuIntegration } from './get-novu-integration.usecase';
import { GetNovuIntegrationCommand } from './get-novu-integration.command';
import { ChannelTypeEnum } from '../../../../../../../packages/stateless/src/lib/template/template.interface';
import { EmailProviderIdEnum } from '../../../../../../../libs/shared/src/consts/providers/provider.enum';
import { endOfMonth, startOfMonth } from 'date-fns';

describe('Get Novu Integration', function () {
  let getNovuIntegration: GetNovuIntegration;
  let executionDetailsRepository: ExecutionDetailsRepository;
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
    executionDetailsRepository = moduleRef.get<ExecutionDetailsRepository>(ExecutionDetailsRepository);
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

    expect(result).to.have.length(1);
    expect(result[0].providerId).to.equal(EmailProviderIdEnum.Novu);
  });

  it('should not return Novu integration for sms', async function () {
    const result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.SMS,
      })
    );

    expect(result).to.have.length(0);
  });

  it('should not return Novu integration if notifications are sent', async function () {
    sinon.stub(executionDetailsRepository, 'count').resolves(1);

    const result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.EMAIL,
      })
    );

    expect(result).to.have.length(0);
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

    expect(result).to.have.length(0);
  });

  it('should not return Novu integration if usage are used already', async function () {
    sinon.stub(messageRepository, 'count').resolves(199);

    let result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.EMAIL,
      })
    );

    expect(result).to.have.length(1);

    sinon.restore();
    sinon.stub(messageRepository, 'count').resolves(200);

    result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.EMAIL,
      })
    );

    expect(result).to.have.length(0);

    sinon.restore();
    const stub = sinon.stub(messageRepository, 'count').resolves(201);

    result = await getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        channelType: ChannelTypeEnum.EMAIL,
      })
    );

    sinon.assert.calledWith(stub, {
      channel: ChannelTypeEnum.EMAIL,
      _organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.Novu,
      createdAt: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
    });

    expect(result).to.have.length(0);
  });
});

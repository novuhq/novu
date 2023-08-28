import { Test } from '@nestjs/testing';
import { ChannelTypeEnum, EmailProviderIdEnum, InAppProviderIdEnum } from '@novu/shared';
import { IntegrationService, NotificationTemplateService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { WorkflowResponse } from '../../dto/workflow-response.dto';
import { WorkflowModule } from '../../workflow.module';
import { GetActiveIntegrationsStatusCommand } from './get-active-integrations-status.command';
import { GetActiveIntegrationsStatus } from './get-active-integrations-status.usecase';

describe('Get Active Integrations Status', function () {
  let useCase: GetActiveIntegrationsStatus;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule, SharedModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<GetActiveIntegrationsStatus>(GetActiveIntegrationsStatus);
  });

  it('should get the active integrations status for workflow', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );
    const template = await notificationTemplateService.createTemplate();

    const integrationService = new IntegrationService();
    await integrationService.deleteAllForOrganization(session.organization._id);
    await integrationService.createIntegration({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
    });
    await integrationService.createIntegration({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
    });

    const command = GetActiveIntegrationsStatusCommand.create({
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      workflows: template,
    });

    const result = (await useCase.execute(command)) as WorkflowResponse;

    expect(result.workflowIntegrationStatus?.hasActiveIntegrations).to.equal(true);
    expect(result.workflowIntegrationStatus?.channels[ChannelTypeEnum.EMAIL].hasActiveIntegrations).to.equal(true);
    expect(result.workflowIntegrationStatus?.channels[ChannelTypeEnum.PUSH].hasActiveIntegrations).to.equal(false);
  });
});

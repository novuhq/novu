import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addBreadcrumb } from '@sentry/node';
import { IntegrationEntity, OrganizationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, IEmailOptions, WorkflowOriginEnum } from '@novu/shared';

import {
  AnalyticsService,
  ApiException,
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
  GetNovuProviderCredentials,
  InstrumentUsecase,
  MailFactory,
  SelectIntegration,
  SelectIntegrationCommand,
} from '@novu/application-generic';
import { SendTestEmailCommand } from './send-test-email.command';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';

@Injectable()
export class SendTestEmail {
  constructor(
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    private organizationRepository: OrganizationRepository,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    private previewStep: PreviewStep
  ) {}

  @InstrumentUsecase()
  public async execute(command: SendTestEmailCommand) {
    const mailFactory = new MailFactory();
    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new NotFoundException('Organization not found');

    const email = command.to;

    addBreadcrumb({
      message: 'Sending Email',
    });

    const integration = await this.selectIntegration.execute(
      SelectIntegrationCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        channelType: ChannelTypeEnum.EMAIL,
        userId: command.userId,
        filterData: {},
      })
    );

    if (!integration) {
      throw new ApiException(`Missing an active email integration`);
    }

    if (integration.providerId === EmailProviderIdEnum.Novu) {
      integration.credentials = await this.getNovuProviderCredentials.execute({
        channelType: integration.channel,
        providerId: integration.providerId,
        environmentId: integration._environmentId,
        organizationId: integration._organizationId,
        userId: command.userId,
      });
    }

    let html = '';
    let subject = '';
    let bridgeProviderData: Record<string, unknown> = {};

    if (!command.bridge) {
      const template = await this.compileEmailTemplateUsecase.execute(
        CompileEmailTemplateCommand.create({
          ...command,
          payload: {
            ...command.payload,
            step: {
              digest: true,
              events: [],
              total_count: 1,
              ...this.getSystemVariables('step', command),
            },
            subscriber: this.getSystemVariables('subscriber', command),
          },
        })
      );
      html = template.html;
      subject = template.subject;
    }

    if (command.bridge) {
      if (!command.workflowId || !command.stepId) {
        throw new BadRequestException('Workflow ID and step ID are required');
      }

      const data = await this.previewStep.execute(
        PreviewStepCommand.create({
          workflowId: command.workflowId,
          stepId: command.stepId,
          controls: command.controls,
          payload: command.payload,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          workflowOrigin: WorkflowOriginEnum.EXTERNAL,
        })
      );

      if (!data.outputs) {
        throw new ApiException('Could not retrieve content from edge');
      }

      html = data.outputs.body as string;
      subject = data.outputs.subject as string;

      if (data.providers && typeof data.providers === 'object') {
        bridgeProviderData = data.providers[integration.providerId] || {};
      }
    }

    if (email && integration) {
      const mailData: IEmailOptions = {
        to: Array.isArray(email) ? email : [email],
        subject,
        html: html as string,
        from: (command.payload.$sender_email as string) || integration?.credentials.from || 'no-reply@novu.co',
      };

      await this.sendMessage(integration, mailData, mailFactory, command, bridgeProviderData);
    }
  }

  private async sendMessage(
    integration: IntegrationEntity,
    mailData: IEmailOptions,
    mailFactory: MailFactory,
    command: SendTestEmailCommand,
    bridgeProviderData: Record<string, unknown>
  ) {
    const { providerId } = integration;

    try {
      const mailHandler = mailFactory.getHandler(integration, mailData.from);
      await mailHandler.send({ ...mailData, bridgeProviderData });
      this.analyticsService.track('Test Email Sent - [Events]', command.userId, {
        _organization: command.organizationId,
        _environment: command.environmentId,
        channel: ChannelTypeEnum.EMAIL,
        providerId,
      });
    } catch (error) {
      throw new ApiException(`Unexpected provider error`);
    }
  }

  private getSystemVariables(variableType: 'subscriber' | 'step' | 'branding', command: SendTestEmailCommand) {
    const variables = {};
    // eslint-disable-next-line guard-for-in
    for (const variable in command.payload) {
      const [type, names] = variable.includes('.') ? variable.split('.') : variable;
      if (type === variableType) {
        variables[names] = command.payload[variable];
      }
    }

    return variables;
  }
}

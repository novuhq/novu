import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { OrganizationRepository, IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, IEmailOptions } from '@novu/shared';
import { ModuleRef } from '@nestjs/core';

import { SendTestEmailCommand } from './send-test-email.command';
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

@Injectable()
export class SendTestEmail {
  constructor(
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    private organizationRepository: OrganizationRepository,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected moduleRef: ModuleRef
  ) {}

  @InstrumentUsecase()
  public async execute(command: SendTestEmailCommand) {
    const mailFactory = new MailFactory();
    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new NotFoundException('Organization not found');

    const email = command.to;

    Sentry.addBreadcrumb({
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

    if (!command.chimera) {
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

    if (command.chimera) {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-chimera')?.PreviewStep) {
          throw new ApiException('Chimera module is not loaded');
        }
        const service = this.moduleRef.get(require('@novu/ee-chimera')?.PreviewStep, { strict: false });
        const data = await service.execute({
          workflowId: command.workflowId,
          stepId: command.stepId,
          inputs: command.inputs,
          data: command.payload,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        });

        if (!data.outputs) {
          throw new ApiException('Could not retrieve content from edge');
        }

        html = data.outputs.body;
        subject = data.outputs.subject;
      }
    }

    if (email && integration) {
      const mailData: IEmailOptions = {
        to: Array.isArray(email) ? email : [email],
        subject,
        html: html as string,
        from: command.payload.$sender_email || integration?.credentials.from || 'no-reply@novu.co',
      };

      await this.sendMessage(integration, mailData, mailFactory, command);

      return;
    }
  }

  private async sendMessage(
    integration: IntegrationEntity,
    mailData: IEmailOptions,
    mailFactory: MailFactory,
    command: SendTestEmailCommand
  ) {
    const { providerId } = integration;

    try {
      const mailHandler = mailFactory.getHandler(integration, mailData.from);
      await mailHandler.send(mailData);
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
    for (const variable in command.payload) {
      const [type, names] = variable.includes('.') ? variable.split('.') : variable;
      if (type === variableType) {
        variables[names] = command.payload[variable];
      }
    }

    return variables;
  }
}

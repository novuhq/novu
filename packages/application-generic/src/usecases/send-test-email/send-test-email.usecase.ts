import { Injectable, NotFoundException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { OrganizationRepository, IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { IEmailOptions } from '@novu/stateless';

import { AnalyticsService } from '../../services/analytics.service';
import { InstrumentUsecase } from '../../instrumentation';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../get-decrypted-integrations';
import { MailFactory } from '../../factories/mail/mail.factory';
import { GetNovuIntegration } from '../get-novu-integration';
import {
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
} from '../compile-email-template';
import { SendTestEmailCommand } from './send-test-email.command';
import { ApiException } from '../../utils/exceptions';

@Injectable()
export class SendTestEmail {
  constructor(
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    private organizationRepository: OrganizationRepository,
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    private analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  public async execute(command: SendTestEmailCommand) {
    const mailFactory = new MailFactory();
    const organization = await this.organizationRepository.findById(
      command.organizationId
    );
    if (!organization) throw new NotFoundException('Organization not found');

    const email = command.to;

    Sentry.addBreadcrumb({
      message: 'Sending Email',
    });

    const integration = (
      await this.getDecryptedIntegrationsUsecase.execute(
        GetDecryptedIntegrationsCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: ChannelTypeEnum.EMAIL,
          findOne: true,
          active: true,
          userId: command.userId,
        })
      )
    )[0];

    if (!integration) {
      throw new ApiException(`Missing an active email integration`);
    }

    const { html, subject } = await this.compileEmailTemplateUsecase.execute(
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

    if (email && integration) {
      const mailData: IEmailOptions = {
        to: Array.isArray(email) ? email : [email],
        subject,
        html: html as string,
        from:
          command.payload.$sender_email ||
          integration?.credentials.from ||
          'no-reply@novu.co',
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
      const mailHandler = mailFactory.getHandler(
        {
          ...integration,
          providerId: GetNovuIntegration.mapProviders(
            ChannelTypeEnum.EMAIL,
            providerId
          ),
        },
        mailData.from
      );
      await mailHandler.send(mailData);
      this.analyticsService.track(
        'Test Email Sent - [Events]',
        command.userId,
        {
          _organization: command.organizationId,
          _environment: command.environmentId,
          channel: ChannelTypeEnum.EMAIL,
          providerId,
        }
      );
    } catch (error) {
      throw new ApiException(`Unexpected provider error`);
    }
  }

  private getSystemVariables(
    variableType: 'subscriber' | 'step' | 'branding',
    command: SendTestEmailCommand
  ) {
    const variables = {};
    for (const variable in command.payload) {
      const [type, names] = variable.includes('.')
        ? variable.split('.')
        : variable;
      if (type === variableType) {
        variables[names] = command.payload[variable];
      }
    }

    return variables;
  }
}

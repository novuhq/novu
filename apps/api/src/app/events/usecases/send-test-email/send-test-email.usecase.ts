import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
  GetNovuProviderCredentials,
  InstrumentUsecase,
  MailFactory,
  PreviewStep,
  PreviewStepCommand,
  SelectIntegration,
  SelectIntegrationCommand,
} from '@novu/application-generic';
import { IntegrationEntity, MessageRepository, OrganizationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials, IEmailOptions, ResourceOriginEnum } from '@novu/shared';
import { addBreadcrumb } from '@sentry/node';
import { SendTestEmailCommand } from './send-test-email.command';

interface CompiledTestEmail {
  html: string;
  subject: string;
  bridgeProviderData: Record<string, unknown>;
}

@Injectable()
export class SendTestEmail {
  constructor(
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    private organizationRepository: OrganizationRepository,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    private previewStep: PreviewStep,
    private messageRepository: MessageRepository
  ) {}

  @InstrumentUsecase()
  public async execute(command: SendTestEmailCommand) {
    const mailFactory = new MailFactory();
    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new NotFoundException('Organization not found');

    addBreadcrumb({
      message: 'Sending Email',
    });

    const selection = await this.selectIntegration.execute(
      SelectIntegrationCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        channelType: ChannelTypeEnum.EMAIL,
        userId: command.userId,
        filterData: {},
      })
    );

    if (!selection) {
      throw new BadRequestException('Missing an active email integration');
    }

    const { integration } = selection;
    const isSharedProvider = integration.providerId === EmailProviderIdEnum.Novu;
    const compiled = await this.compileContent(command, integration);
    const recipients = normalizeRecipients(command.to);

    if (recipients.length === 0) {
      return;
    }

    if (isSharedProvider) {
      integration.credentials = await this.reserveSharedProviderSend(
        command,
        integration,
        recipients,
        compiled.subject
      );
    }

    const mailData: IEmailOptions = {
      to: recipients,
      subject: compiled.subject,
      html: compiled.html,
      from: resolveFromAddress(command, integration, isSharedProvider),
    };
    const bridgeProviderData = isSharedProvider ? {} : compiled.bridgeProviderData;

    await this.sendMessage(integration, mailData, mailFactory, command, bridgeProviderData);
  }

  private async compileContent(
    command: SendTestEmailCommand,
    integration: IntegrationEntity
  ): Promise<CompiledTestEmail> {
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

      return {
        html: template.html,
        subject: template.subject,
        bridgeProviderData: {},
      };
    }

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
        workflowOrigin: ResourceOriginEnum.EXTERNAL,
      })
    );

    if (!data.outputs) {
      throw new BadRequestException('Could not retrieve content from edge');
    }

    const bridgeProviderData =
      data.providers && typeof data.providers === 'object' ? data.providers[integration.providerId] || {} : {};

    return {
      html: data.outputs.body as string,
      subject: data.outputs.subject as string,
      bridgeProviderData,
    };
  }

  /**
   * Each accepted recipient is written before the next credential lookup so the
   * shared-provider monthly cap sees this request before the provider is called.
   * A later rejection removes those rows and does not send.
   */
  private async reserveSharedProviderSend(
    command: SendTestEmailCommand,
    integration: IntegrationEntity,
    recipients: string[],
    subject: string
  ): Promise<ICredentials> {
    const reservedMessageIds: string[] = [];

    try {
      let credentials: ICredentials | undefined;

      for (const recipient of recipients) {
        credentials = await this.getNovuProviderCredentials.execute({
          channelType: ChannelTypeEnum.EMAIL,
          providerId: integration.providerId,
          environmentId: integration._environmentId,
          organizationId: integration._organizationId,
          userId: command.userId,
          recipientEmail: recipient,
          requireRecipientMatch: true,
        });

        const message = await this.messageRepository.create({
          _organizationId: integration._organizationId,
          _environmentId: integration._environmentId,
          channel: ChannelTypeEnum.EMAIL,
          providerId: EmailProviderIdEnum.Novu,
          email: recipient,
          subject,
          transactionId: randomUUID(),
          tags: ['test-email'],
        });
        reservedMessageIds.push(message._id);
      }

      if (!credentials) {
        throw new BadRequestException('Missing an active email integration');
      }

      return credentials;
    } catch (error) {
      await this.releaseSharedProviderReservation(
        integration._organizationId,
        integration._environmentId,
        reservedMessageIds
      );

      throw error;
    }
  }

  private async releaseSharedProviderReservation(organizationId: string, environmentId: string, messageIds: string[]) {
    if (messageIds.length === 0) {
      return;
    }

    try {
      await this.messageRepository.delete({
        _id: { $in: messageIds },
        _organizationId: organizationId,
        _environmentId: environmentId,
      });
    } catch (cleanupError) {
      addBreadcrumb({
        message: 'Failed to release shared provider test-email reservation',
        data: {
          organizationId,
          environmentId,
          messageIds,
          cleanupError,
        },
      });
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
    } catch (_error) {
      throw new BadRequestException('Unexpected provider error');
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

function normalizeRecipients(to: string | string[]): string[] {
  const recipients = Array.isArray(to) ? to : [to];

  return recipients
    .filter((recipient): recipient is string => typeof recipient === 'string')
    .map((recipient) => recipient.trim())
    .filter((recipient) => recipient.length > 0);
}

function resolveFromAddress(
  command: SendTestEmailCommand,
  integration: IntegrationEntity,
  isSharedProvider: boolean
): string {
  if (isSharedProvider) {
    return integration.credentials?.from || 'no-reply@novu.co';
  }

  const senderEmail = command.payload?.$sender_email;
  if (typeof senderEmail === 'string' && senderEmail.length > 0) {
    return senderEmail;
  }

  return integration.credentials?.from || 'no-reply@novu.co';
}

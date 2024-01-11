import { Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import {
  IntegrationEntity,
  IntegrationQuery,
  IntegrationRepository,
  MemberRepository,
  MessageRepository,
} from '@novu/dal';
import { ChannelTypeEnum, providers } from '@novu/shared';
import { IEmailProvider, ISmsProvider } from '@novu/stateless';
import {
  AnalyticsService,
  ApiException,
  IMailHandler,
  ISmsHandler,
  MailFactory,
  SmsFactory,
} from '@novu/application-generic';

import { WebhookCommand } from './webhook.command';

import { CreateExecutionDetails } from '../execution-details/create-execution-details.usecase';

import { IWebhookResult } from '../../dtos/webhooks-response.dto';
import { WebhookTypes } from '../../interfaces/webhook.interface';

@Injectable({ scope: Scope.REQUEST })
export class Webhook {
  public readonly mailFactory = new MailFactory();
  public readonly smsFactory = new SmsFactory();
  private provider: IEmailProvider | ISmsProvider;

  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    private integrationRepository: IntegrationRepository,
    private memberRepository: MemberRepository,
    private messageRepository: MessageRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: WebhookCommand): Promise<IWebhookResult[]> {
    const providerOrIntegrationId = command.providerOrIntegrationId;
    const isProviderId = !!providers.find((el) => el.id === providerOrIntegrationId);
    const channel: ChannelTypeEnum = command.type === 'email' ? ChannelTypeEnum.EMAIL : ChannelTypeEnum.SMS;

    const query: IntegrationQuery = {
      ...(isProviderId
        ? { providerId: providerOrIntegrationId, credentials: { $exists: true }, channel }
        : { _id: providerOrIntegrationId }),
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    const integration: IntegrationEntity = await this.integrationRepository.findOne(query);
    if (!integration) {
      throw new NotFoundException(`Integration for ${providerOrIntegrationId} was not found`);
    }

    const hasNoCredentials = !integration.credentials || Object.keys(integration.credentials).length === 0;
    if (hasNoCredentials) {
      throw new ApiException(`Integration ${integration._id} doesn't have credentials set up`);
    }

    const member = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);
    if (member) {
      this.analyticsService.track('[Webhook] - Provider Webhook called', member._userId, {
        _organization: command.organizationId,
        _environmentId: command.environmentId,
        providerId: integration.providerId,
        channel,
      });
    }

    this.createProvider(integration, command.type);

    if (!this.provider.getMessageId || !this.provider.parseEventBody) {
      throw new NotFoundException(`Provider with ${integration.providerId} can not handle webhooks`);
    }

    const events = await this.parseEvents(command, integration.providerId, channel);

    if (member) {
      this.analyticsService.track('[Webhook] - Provider Webhook events parsed', member._userId, {
        _organization: command.organizationId,
        _environmentId: command.environmentId,
        providerId: integration.providerId,
        channel,
        events,
      });
    }

    return events;
  }

  private async parseEvents(
    command: WebhookCommand,
    providerId: string,
    channel: ChannelTypeEnum
  ): Promise<IWebhookResult[]> {
    const body = command.body;
    const messageIdentifiers: string[] = this.provider.getMessageId(body);

    const events: IWebhookResult[] = [];

    for (const messageIdentifier of messageIdentifiers) {
      const event = await this.parseEvent(messageIdentifier, command, providerId, channel);

      if (event === undefined) {
        continue;
      }

      events.push(event);
    }

    return events;
  }

  private async parseEvent(
    messageIdentifier: string,
    command: WebhookCommand,
    providerId: string,
    channel: ChannelTypeEnum
  ): Promise<IWebhookResult | undefined> {
    const message = await this.messageRepository.findOne({
      identifier: messageIdentifier,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!message) {
      Logger.error(`Message with ${messageIdentifier} as identifier was not found`);

      return;
    }

    const event = this.provider.parseEventBody(command.body, messageIdentifier);

    if (event === undefined) {
      return undefined;
    }

    const parsedEvent = {
      id: messageIdentifier,
      event,
    };

    /**
     * TODO: Individually performing the creation of the execution details because here we can pass message that contains
     * most of the __foreign keys__ we need. But we can't take advantage of a bulk write of all events. Besides the writing
     * being hiding inside auxiliary methods of the use case.
     */
    await this.createExecutionDetails.execute({
      message,
      webhook: {
        ...command,
        providerId: providerId,
      },
      webhookEvent: parsedEvent,
      channel,
    });

    return parsedEvent;
  }

  private getHandler(integration: IntegrationEntity, type: WebhookTypes): ISmsHandler | IMailHandler | null {
    switch (type) {
      case 'sms':
        return this.smsFactory.getHandler(integration);
      default:
        return this.mailFactory.getHandler(integration);
    }
  }

  private createProvider(integration: IntegrationEntity, type: 'sms' | 'email') {
    const handler = this.getHandler(integration, type);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${integration.providerId} was not found`);
    }
    handler.buildProvider(integration.credentials);

    this.provider = handler.getProvider();
  }
}

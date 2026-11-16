import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AnalyticsService,
  FeatureFlagsService,
  IMailHandler,
  ISmsHandler,
  MailFactory,
  SmsFactory,
} from '@novu/application-generic';
import { IntegrationEntity, IntegrationQuery, IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, FeatureFlagsKeysEnum, providers } from '@novu/shared';
import { IEmailProvider, ISmsProvider } from '@novu/stateless';
import { IWebhookResult } from '../../dtos/webhooks-response.dto';
import { WebhookTypes } from '../../interfaces/webhook.interface';
import { CreateExecutionDetails } from '../execution-details/create-execution-details.usecase';
import { WebhookCommand } from './webhook.command';

@Injectable({ scope: Scope.REQUEST })
export class Webhook {
  public readonly mailFactory = new MailFactory();
  public readonly smsFactory = new SmsFactory();
  private provider: IEmailProvider | ISmsProvider;
  private handler: IMailHandler | ISmsHandler;

  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    private integrationRepository: IntegrationRepository,
    private messageRepository: MessageRepository,
    private analyticsService: AnalyticsService,
    private featureFlagsService: FeatureFlagsService
  ) {}

  async execute(command: WebhookCommand): Promise<IWebhookResult[]> {
    const { providerOrIntegrationId } = command;
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
      throw new BadRequestException(`Integration ${integration._id} doesn't have credentials set up`);
    }

    this.analyticsService.track('[Webhook] - Provider Webhook called', '', {
      _organization: command.organizationId,
      _environmentId: command.environmentId,
      providerId: integration.providerId,
      channel,
    });

    const isSignatureVerificationEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_LEGACY_WEBHOOK_SIGNATURE_VERIFICATION_ENABLED,
      defaultValue: true,
      organization: { _id: command.organizationId },
      environment: { _id: command.environmentId },
    });

    this.createProvider(integration, command.type, isSignatureVerificationEnabled);

    if (!this.provider.getMessageId || !this.provider.parseEventBody) {
      throw new NotFoundException(`Provider with ${integration.providerId} can not handle webhooks`);
    }

    if (isSignatureVerificationEnabled) {
      await this.verifySignature(command, integration);
    }

    const events = await this.parseEvents(command, integration.providerId, channel);

    this.analyticsService.track('[Webhook] - Provider Webhook events parsed', '', {
      _organization: command.organizationId,
      _environmentId: command.environmentId,
      providerId: integration.providerId,
      channel,
      events,
    });

    return events;
  }

  private async parseEvents(
    command: WebhookCommand,
    providerId: string,
    channel: ChannelTypeEnum
  ): Promise<IWebhookResult[]> {
    const { body } = command;
    const messageIdentifiers = this.normalizeMessageIdentifiers(this.provider.getMessageId(body));

    const events: IWebhookResult[] = [];

    for (const { messageIdentifier, eventIndex } of messageIdentifiers) {
      const event = await this.parseEvent(messageIdentifier, command, providerId, channel, eventIndex);

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
    channel: ChannelTypeEnum,
    eventIndex: number
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

    const event = this.provider.parseEventBody(
      command.body,
      messageIdentifier,
      Array.isArray(command.body) ? eventIndex : undefined
    );

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
        providerId,
      },
      webhookEvent: parsedEvent,
      channel,
    });

    return parsedEvent;
  }

  private async verifySignature(command: WebhookCommand, integration: IntegrationEntity): Promise<void> {
    // Handlers whose provider doesn't implement verification (e.g. all SMS providers today) return success.
    const result = await this.handler.verifySignature({
      body: command.body as Record<string, unknown>,
      headers: command.headers ?? {},
      rawBody: command.rawBody,
    });

    if (!result.success) {
      Logger.warn(
        `Webhook signature verification failed for integration ${integration._id} (${integration.providerId}): ${result.message}`
      );

      throw new UnauthorizedException(`Invalid signature: ${result.message}`);
    }
  }

  /**
   * Provider parsers return identifiers straight from the request body. Only strings (and numbers, which Mongo would
   * cast to a string anyway) are valid message identifiers — anything else, e.g. `{ "$ne": null }`, would turn the
   * message lookup into a query operator, so it is dropped.
   *
   * Each kept identifier carries its position in the original body: batch parsers (e.g. SendGrid) use that index to
   * pick the matching body entry, so it must not shift when earlier entries are dropped.
   */
  private normalizeMessageIdentifiers(identifiers: unknown): { messageIdentifier: string; eventIndex: number }[] {
    if (!Array.isArray(identifiers)) {
      return [];
    }

    return identifiers.flatMap((identifier, eventIndex) => {
      if (typeof identifier === 'string' && identifier.length > 0) {
        return [{ messageIdentifier: identifier, eventIndex }];
      }

      if (typeof identifier === 'number' && Number.isFinite(identifier)) {
        return [{ messageIdentifier: String(identifier), eventIndex }];
      }

      if (identifier !== undefined && identifier !== null) {
        Logger.warn(`Ignoring webhook message identifier of unsupported type: ${typeof identifier}`);
      }

      return [];
    });
  }

  private getHandler(integration: IntegrationEntity, type: WebhookTypes): ISmsHandler | IMailHandler | null {
    switch (type) {
      case 'sms':
        return this.smsFactory.getHandler(integration);
      default:
        return this.mailFactory.getHandler(integration);
    }
  }

  private createProvider(
    integration: IntegrationEntity,
    type: 'sms' | 'email',
    withSignatureVerificationConfig: boolean
  ) {
    const handler = this.getHandler(integration, type);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${integration.providerId} was not found`);
    }

    /*
     * Signing keys (`inboundWebhookSigningKey`) live on `configurations`. Only merge them in when verification is on,
     * so the provider is built exactly as before for everyone else.
     */
    handler.buildProvider(
      withSignatureVerificationConfig
        ? { ...integration.credentials, ...integration.configurations }
        : integration.credentials
    );

    this.handler = handler;
    this.provider = handler.getProvider();
  }
}

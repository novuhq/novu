import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InstrumentUsecase, PinoLogger, shortId } from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  ContextRepository,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelEndpointByType, ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';
import { ConfirmLinkedAuthCardsCommand } from '../../../agents/conversation-runtime/link/confirm-linked-auth-cards.command';
import { ConfirmLinkedAuthCards } from '../../../agents/conversation-runtime/link/confirm-linked-auth-cards.usecase';
import { AgentPlatformEnum } from '../../../agents/shared/enums/agent-platform.enum';
import { CreateChannelEndpointCommand } from './create-channel-endpoint.command';

/**
 * Reverses {@link PLATFORM_ENDPOINT_CONFIG}: maps a freshly created channel endpoint
 * back to the `(platform, platformUserId)` of the user who just linked, for the
 * real-time auth-card confirmation. Only the three user-linking endpoint types carry
 * a linkable identity; channel/webhook/phone endpoints are not user links.
 */
function deriveLinkedPlatformUser(
  type: ChannelEndpointType,
  endpoint: ChannelEndpointByType[ChannelEndpointType]
): { platform: AgentPlatformEnum; platformUserId: string } | null {
  switch (type) {
    case ENDPOINT_TYPES.SLACK_USER:
      return { platform: AgentPlatformEnum.SLACK, platformUserId: (endpoint as { userId: string }).userId };
    case ENDPOINT_TYPES.MS_TEAMS_USER:
      return { platform: AgentPlatformEnum.TEAMS, platformUserId: (endpoint as { userId: string }).userId };
    case ENDPOINT_TYPES.TELEGRAM_CHAT:
      return { platform: AgentPlatformEnum.TELEGRAM, platformUserId: (endpoint as { chatId: string }).chatId };
    case ENDPOINT_TYPES.SLACK_CHANNEL:
    case ENDPOINT_TYPES.WEBHOOK:
    case ENDPOINT_TYPES.PHONE:
    case ENDPOINT_TYPES.MS_TEAMS_CHANNEL:
      return null;
    default: {
      const exhaustiveCheck: never = type;

      return exhaustiveCheck;
    }
  }
}

@Injectable()
export class CreateChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly contextRepository: ContextRepository,
    private readonly moduleRef: ModuleRef,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    const integration = await this.findIntegration(command);
    const contextKeys = await this.resolveContexts(command);

    await this.assertSubscriberExists(command);

    const identifier = command.identifier || this.generateIdentifier();

    // Check if channel endpoint already exists
    const existingChannelEndpoint = await this.channelEndpointRepository.findOne({
      identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (existingChannelEndpoint) {
      throw new ConflictException(
        `Channel endpoint with identifier "${identifier}" already exists in environment "${command.environmentId}"`
      );
    }

    let connection: ChannelConnectionEntity | null = null;

    if (command.connectionIdentifier) {
      connection = await this.findChannelConnection(command);
    }

    const channelEndpoint = await this.createChannelEndpoint(command, identifier, integration, connection, contextKeys);

    // Best-effort, non-blocking: linking is the moment a pending auth CTA card can be
    // confirmed. Never let it fail or slow endpoint creation.
    void this.confirmLinkedAuthCards(command, integration);

    return channelEndpoint;
  }

  /**
   * Fires the real-time "account linked" confirmation for any conversation still
   * showing this user an auth CTA card. Lazily resolved via {@link ModuleRef}
   * (`strict: false`) because the use case lives in `AgentsModule`, which imports
   * `ChannelEndpointsModule` — a direct dependency would be circular. Fully
   * swallowed so linking is never affected.
   */
  private async confirmLinkedAuthCards(
    command: CreateChannelEndpointCommand,
    integration: IntegrationEntity
  ): Promise<void> {
    const derived = deriveLinkedPlatformUser(command.type, command.endpoint);
    if (!derived) {
      return;
    }

    try {
      const confirmLinkedAuthCards = this.moduleRef.get(ConfirmLinkedAuthCards, { strict: false });

      await confirmLinkedAuthCards.execute(
        ConfirmLinkedAuthCardsCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          integrationIdentifier: integration.identifier,
          integrationId: integration._id,
          platform: derived.platform,
          platformUserId: derived.platformUserId,
        })
      );
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), integrationId: integration._id },
        'Failed to confirm linked auth cards after channel endpoint creation'
      );
    }
  }

  private async resolveContexts(command: CreateChannelEndpointCommand<ChannelEndpointType>): Promise<string[]> {
    // A session-validated context arrives pre-resolved as keys — persist verbatim
    // (never re-resolve/trust the raw payload alongside it).
    if (command.contextKeys?.length) {
      return command.contextKeys;
    }

    if (!command.context) {
      return [];
    }

    const contexts = await this.contextRepository.findOrCreateContextsFromPayload(
      command.environmentId,
      command.organizationId,
      command.context
    );

    return contexts.map((context) => context.key);
  }

  private async createChannelEndpoint(
    command: CreateChannelEndpointCommand,
    identifier: string,
    integration: IntegrationEntity,
    connection: ChannelConnectionEntity | null,
    contextKeys: string[]
  ): Promise<ChannelEndpointEntity> {
    const channelEndpoint = await this.channelEndpointRepository.create({
      identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      connectionIdentifier: connection?.identifier,
      integrationIdentifier: integration.identifier,
      providerId: integration.providerId,
      channel: integration.channel,
      subscriberId: command.subscriberId,
      contextKeys,
      type: command.type,
      endpoint: command.endpoint,
    });

    return channelEndpoint;
  }

  private async assertSubscriberExists(command: CreateChannelEndpointCommand) {
    if (!command.subscriberId) {
      return;
    }

    const found = await this.subscriberRepository.findOne({
      subscriberId: command.subscriberId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!found) throw new NotFoundException(`Subscriber not found: ${command.subscriberId}`);

    return;
  }

  private async findIntegration(command: CreateChannelEndpointCommand) {
    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(`Integration not found: ${command.integrationIdentifier}`);
    }

    return integration;
  }

  private async findChannelConnection(command: CreateChannelEndpointCommand): Promise<ChannelConnectionEntity> {
    const connection = await this.channelConnectionRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.connectionIdentifier,
    });

    if (!connection) {
      throw new NotFoundException(`Channel connection not found: ${command.connectionIdentifier}`);
    }

    return connection;
  }

  private generateIdentifier(): string {
    return `chendp_${shortId(12)}`;
  }
}

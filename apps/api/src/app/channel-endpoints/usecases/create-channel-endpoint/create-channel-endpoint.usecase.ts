import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  encryptChannelConnectionAuth,
  InstrumentUsecase,
  PinoLogger,
  shortId,
} from '@novu/application-generic';
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
import {
  ChannelEndpointByType,
  ChannelEndpointType,
  ChatProviderIdEnum,
  ENDPOINT_TYPES,
  ToolProviderIdEnum,
} from '@novu/shared';
import { ConfirmLinkedAuthCardsCommand } from '../../../agents/conversation-runtime/link/confirm-linked-auth-cards.command';
import { ConfirmLinkedAuthCards } from '../../../agents/conversation-runtime/link/confirm-linked-auth-cards.usecase';
import { AgentPlatformEnum } from '../../../agents/shared/enums/agent-platform.enum';
import { ConnectionBackedEndpointConfig, getConnectionBackedEndpointConfig } from '../../connection-backed-endpoints';
import { CreateChannelEndpointCommand } from './create-channel-endpoint.command';

const MONGO_DUPLICATE_KEY_CODE = 11000;

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
    case ENDPOINT_TYPES.WEBEX_ROOM:
    case ENDPOINT_TYPES.WEBEX_PERSON:
    case ENDPOINT_TYPES.LINE_USER:
    case ENDPOINT_TYPES.OPSGENIE_INTEGRATION:
    case ENDPOINT_TYPES.PAGERDUTY_SERVICE:
    case ENDPOINT_TYPES.TOOL_WEBHOOK:
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
    private readonly createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase,
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

    const connectionBackedConfig = getConnectionBackedEndpointConfig(command.type);
    if (connectionBackedConfig) {
      this.assertConnectionBackedIntegration(command.type, integration);

      return await this.createConnectionBackedEndpoint(
        command,
        identifier,
        integration,
        contextKeys,
        connectionBackedConfig
      );
    }

    let connection: ChannelConnectionEntity | null = null;

    if (this.isWebexEndpoint(command.type)) {
      this.assertWebexIntegration(command, integration);

      if (!command.connectionIdentifier) {
        throw new BadRequestException(`Channel endpoint type "${command.type}" requires a connectionIdentifier`);
      }
    }

    if (command.connectionIdentifier) {
      connection = await this.findChannelConnection(command);
    }

    if (this.isWebexEndpoint(command.type) && connection) {
      this.assertWebexConnectionContext(command, connection, contextKeys);
    }

    const channelEndpoint = await this.createChannelEndpoint(command, identifier, integration, connection, contextKeys);

    // Best-effort, non-blocking: linking is the moment a pending auth CTA card can be
    // confirmed. Never let it fail or slow endpoint creation.
    //
    // Gated on `platformIdentityVerified`: confirming a subscriber's pending auth CTA
    // is security-sensitive, so it must only fire when the caller has verified that the
    // `platformUserId` in the payload actually belongs to the linking user (OAuth token
    // exchange, verified provider deep-link, or authenticated inbound webhook). Callers
    // that accept an arbitrary `endpoint` (e.g. the public channel-endpoint API) leave
    // it unset, so a client cannot force-confirm another user's auth gate.
    if (command.platformIdentityVerified === true) {
      void this.confirmLinkedAuthCards(command, integration);
    }

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

  /**
   * PagerDuty / Opsgenie / Tool webhook routing is per subscriber. The wire
   * payload (e.g. `{ routingKey, region }`, `{ apiKey, region }`, or
   * `{ url, headers?, method? }`) is persisted encrypted on a fresh
   * `ChannelConnection.auth`. The stored `ChannelEndpoint.endpoint` document
   * is empty — the read path re-hydrates the wire shape from the decrypted
   * auth.
   *
   * Ordering: connection first, endpoint second. If the endpoint create fails
   * (partial unique index → duplicate subscriber/integration pair — PagerDuty
   * and Opsgenie only; tool_webhook has no such index and allows multiple
   * endpoints per subscriber/integration), we delete the just-created
   * connection so a retry starts from a clean slate.
   */
  private async createConnectionBackedEndpoint(
    command: CreateChannelEndpointCommand,
    identifier: string,
    integration: IntegrationEntity,
    contextKeys: string[],
    config: ConnectionBackedEndpointConfig
  ): Promise<ChannelEndpointEntity> {
    const wireEndpoint = command.endpoint as Record<string, unknown>;
    const connectionIdentifier = this.generateConnectionIdentifier();

    let createdConnection: ChannelConnectionEntity | null = null;
    try {
      createdConnection = await this.channelConnectionRepository.create({
        identifier: connectionIdentifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        integrationIdentifier: integration.identifier,
        providerId: integration.providerId,
        channel: integration.channel,
        subscriberId: command.subscriberId,
        contextKeys,
        workspace: { ...config.workspace },
        auth: encryptChannelConnectionAuth({ ...wireEndpoint }),
      });

      const endpoint = await this.channelEndpointRepository.create({
        identifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        connectionIdentifier: createdConnection.identifier,
        integrationIdentifier: integration.identifier,
        providerId: integration.providerId,
        channel: integration.channel,
        subscriberId: command.subscriberId,
        contextKeys,
        type: command.type,
        // Wire shape lives on the connection; the stored document is empty.
        endpoint: {},
      });

      // Hydrate the returned entity's endpoint so the response DTO carries the
      // wire shape without a second connection lookup.
      return { ...endpoint, endpoint: { ...wireEndpoint } } as ChannelEndpointEntity;
    } catch (error) {
      if (createdConnection) {
        await this.channelConnectionRepository.delete({
          _id: createdConnection._id,
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
        });
      }

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          `${config.label} endpoint already exists for subscriber "${command.subscriberId}" on integration "${integration.identifier}"`
        );
      }

      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' && error !== null && (error as { code?: number }).code === MONGO_DUPLICATE_KEY_CODE
    );
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

    if (found) {
      return;
    }

    if (!command.createSubscriberIfMissing) {
      throw new NotFoundException(
        `Subscriber not found: ${command.subscriberId}. ` +
          `Pass createSubscriberIfMissing: true to create it, or provision it via POST /v1/subscribers.`
      );
    }

    // `allowUpdate: false` makes this a create-only path: it never mutates an
    // existing subscriber, so a concurrent create resolves to a harmless no-op.
    await this.createOrUpdateSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        allowUpdate: false,
      })
    );
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
      integrationIdentifier: command.integrationIdentifier,
      identifier: command.connectionIdentifier,
    });

    if (!connection) {
      throw new NotFoundException(`Channel connection not found: ${command.connectionIdentifier}`);
    }

    return connection;
  }

  private isWebexEndpoint(type: ChannelEndpointType): boolean {
    return type === ENDPOINT_TYPES.WEBEX_ROOM || type === ENDPOINT_TYPES.WEBEX_PERSON;
  }

  private assertWebexIntegration(command: CreateChannelEndpointCommand, integration: IntegrationEntity): void {
    if (integration.providerId !== ChatProviderIdEnum.WebexMessaging) {
      throw new BadRequestException(`Channel endpoint type "${command.type}" requires a Webex Messaging integration`);
    }
  }

  private assertConnectionBackedIntegration(type: ChannelEndpointType, integration: IntegrationEntity): void {
    if (type === ENDPOINT_TYPES.PAGERDUTY_SERVICE && integration.providerId !== ToolProviderIdEnum.PagerDuty) {
      throw new BadRequestException(`Channel endpoint type "${type}" requires a PagerDuty integration`);
    }

    if (type === ENDPOINT_TYPES.OPSGENIE_INTEGRATION && integration.providerId !== ToolProviderIdEnum.Opsgenie) {
      throw new BadRequestException(`Channel endpoint type "${type}" requires an Opsgenie integration`);
    }

    if (type === ENDPOINT_TYPES.TOOL_WEBHOOK && integration.providerId !== ToolProviderIdEnum.Webhook) {
      throw new BadRequestException(`Channel endpoint type "${type}" requires a Tool webhook integration`);
    }
  }

  private assertWebexConnectionContext(
    command: CreateChannelEndpointCommand,
    connection: ChannelConnectionEntity,
    contextKeys: string[]
  ): void {
    const connectionContextKeys = connection.contextKeys ?? [];
    const hasSameContext =
      contextKeys.length === connectionContextKeys.length &&
      contextKeys.every((contextKey) => connectionContextKeys.includes(contextKey));

    if (!hasSameContext) {
      throw new BadRequestException(
        `Webex endpoint context must match channel connection "${command.connectionIdentifier}" context`
      );
    }
  }

  private generateIdentifier(): string {
    return `chendp_${shortId(12)}`;
  }

  private generateConnectionIdentifier(): string {
    return `chconn_${shortId(12)}`;
  }
}

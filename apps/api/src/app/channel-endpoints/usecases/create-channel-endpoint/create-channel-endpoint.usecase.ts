import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  encryptChannelConnectionAuth,
  InstrumentUsecase,
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
import { ChannelEndpointType, ChatProviderIdEnum, ENDPOINT_TYPES, ToolProviderIdEnum } from '@novu/shared';
import { ConnectionBackedEndpointConfig, getConnectionBackedEndpointConfig } from '../../connection-backed-endpoints';
import { CreateChannelEndpointCommand } from './create-channel-endpoint.command';

const MONGO_DUPLICATE_KEY_CODE = 11000;

@Injectable()
export class CreateChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly contextRepository: ContextRepository,
    private readonly createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase
  ) {}

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

    return channelEndpoint;
  }

  private async resolveContexts(command: CreateChannelEndpointCommand<ChannelEndpointType>): Promise<string[]> {
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
   * PagerDuty / Opsgenie routing is per subscriber. The wire payload (e.g.
   * `{ routingKey, region }` or `{ apiKey, region }`) is persisted encrypted on
   * a fresh `ChannelConnection.auth`. The stored `ChannelEndpoint.endpoint`
   * document is empty — the read path re-hydrates the wire shape from the
   * decrypted auth.
   *
   * Ordering: connection first, endpoint second. If the endpoint create fails
   * (partial unique index → duplicate subscriber/integration pair), we delete
   * the just-created connection so a retry starts from a clean slate.
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

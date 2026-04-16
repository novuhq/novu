import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, shortId } from '@novu/application-generic';
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
import { ChannelEndpointType } from '@novu/shared';
import { CreateChannelEndpointCommand } from './create-channel-endpoint.command';

@Injectable()
export class CreateChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly contextRepository: ContextRepository
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

    let connection: ChannelConnectionEntity | null = null;

    if (command.connectionIdentifier) {
      connection = await this.findChannelConnection(command);
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

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, shortId } from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  ContextRepository,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { CreateChannelConnectionCommand } from './create-channel-connection.command';

@Injectable()
export class CreateChannelConnection {
  constructor(
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly contextRepository: ContextRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateChannelConnectionCommand): Promise<ChannelConnectionEntity> {
    this.validateResourceOrContext(command);

    const integration = await this.findIntegration(command);
    const contextKeys = await this.resolveContexts(command);

    await this.assertSubscriberExists(command);
    await this.ensureUniqueConnectionForResourceAndContext(command, integration, contextKeys);

    const identifier = command.identifier || this.generateIdentifier();

    // Check if channel connection already exists
    const existingChannelConnection = await this.channelConnectionRepository.findOne({
      identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (existingChannelConnection) {
      throw new ConflictException(
        `Channel connection with identifier "${identifier}" already exists in environment "${command.environmentId}"`
      );
    }

    const channelConnection = await this.createChannelConnection(command, identifier, integration, contextKeys);

    return channelConnection;
  }

  private validateResourceOrContext(command: CreateChannelConnectionCommand) {
    const { subscriberId, context } = command;

    if (!subscriberId && !context) {
      throw new BadRequestException('Either subscriberId or context must be provided');
    }
  }

  private async resolveContexts(command: CreateChannelConnectionCommand): Promise<string[]> {
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

  /**
   * Ensures only one channel connection exists per unique combination of integration + resource + context.
   * Any variation in integration, resource, or context creates a separate connection.
   */
  private async ensureUniqueConnectionForResourceAndContext(
    command: CreateChannelConnectionCommand,
    integration: IntegrationEntity,
    contextKeys: string[]
  ) {
    const baseQuery = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      integrationIdentifier: integration.identifier,
      subscriberId: command.subscriberId,
    };

    const contextQuery = this.channelConnectionRepository.buildContextExactMatchQuery(contextKeys);

    const existingChannelConnection = await this.channelConnectionRepository.findOne({
      ...baseQuery,
      ...contextQuery,
    });

    if (existingChannelConnection) {
      const subscriberIdPart = command.subscriberId ? `subscriberId "${command.subscriberId}"` : 'no subscriberId';
      const contextPart = contextKeys.length > 0 ? `context [${contextKeys.join(', ')}]` : 'no context';

      throw new ConflictException(
        `A channel connection already exists for integration "${integration.identifier}" with ${subscriberIdPart} and ${contextPart}. Connection ID: ${existingChannelConnection.identifier}`
      );
    }
  }

  private async createChannelConnection(
    command: CreateChannelConnectionCommand,
    identifier: string,
    integration: IntegrationEntity,
    contextKeys: string[]
  ): Promise<ChannelConnectionEntity> {
    const channelConnection = await this.channelConnectionRepository.create({
      identifier,
      integrationIdentifier: integration.identifier,
      providerId: integration.providerId,
      channel: integration.channel,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      contextKeys,
      workspace: command.workspace,
      auth: command.auth,
    });

    return channelConnection;
  }

  private async assertSubscriberExists(command: CreateChannelConnectionCommand) {
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

  private async findIntegration(command: CreateChannelConnectionCommand) {
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

  private generateIdentifier(): string {
    return `chconn-${shortId(6)}`;
  }
}

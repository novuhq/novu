import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, shortId } from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { parseResourceKey } from '@novu/shared';
import { CreateChannelConnectionCommand } from './create-channel-connection.command';

@Injectable()
export class CreateChannelConnection {
  constructor(
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateChannelConnectionCommand): Promise<ChannelConnectionEntity> {
    const integration = await this.findIntegration(command);

    await this.assertSingleConnectionPerResourceAndIntegration(command, integration);
    await this.assertResourceExists(command);

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

    const channelConnection = await this.createChannelConnection(command, identifier, integration);

    return channelConnection;
  }

  private async assertSingleConnectionPerResourceAndIntegration(
    command: CreateChannelConnectionCommand,
    integration: IntegrationEntity
  ) {
    const existingChannelConnection = await this.channelConnectionRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      resource: command.resource,
      integrationIdentifier: integration.identifier,
    });

    if (existingChannelConnection) {
      throw new ConflictException(`Only one channel connection per resource and integration is allowed`);
    }
  }

  private async createChannelConnection(
    command: CreateChannelConnectionCommand,
    identifier: string,
    integration: IntegrationEntity
  ): Promise<ChannelConnectionEntity> {
    const channelConnection = await this.channelConnectionRepository.create({
      identifier,
      integrationIdentifier: integration.identifier,
      providerId: integration.providerId,
      channel: integration.channel,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      resource: command.resource,
      workspace: command.workspace,
      auth: command.auth,
    });

    return channelConnection;
  }

  private async assertResourceExists(command: CreateChannelConnectionCommand) {
    const { type, id } = parseResourceKey(command.resource);

    switch (type) {
      case 'subscriber': {
        const found = await this.subscriberRepository.findOne({
          subscriberId: id,
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
        });

        if (!found) throw new NotFoundException(`Subscriber not found: ${id}`);

        return;
      }
      default:
        throw new NotFoundException(`Resource type not found: ${type}`);
    }
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

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, shortId } from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { parseResourceKey } from '@novu/shared';
import { mapChannelEndpointEntityToDto } from '../../dtos/dto.mapper';
import { GetChannelEndpointResponseDto } from '../../dtos/get-channel-endpoint-response.dto';
import { CreateChannelEndpointCommand } from './create-channel-endpoint.command';

@Injectable()
export class CreateChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateChannelEndpointCommand): Promise<GetChannelEndpointResponseDto> {
    const integration = await this.findIntegration(command);

    await this.assertResourceExists(command);

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

    const channelEndpoint = await this.createChannelEndpoint(command, identifier, integration, connection);

    return mapChannelEndpointEntityToDto(channelEndpoint);
  }

  private async createChannelEndpoint(
    command: CreateChannelEndpointCommand,
    identifier: string,
    integration: IntegrationEntity,
    connection: ChannelConnectionEntity | null
  ): Promise<ChannelEndpointEntity> {
    const channelEndpoint = await this.channelEndpointRepository.create({
      identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      connectionIdentifier: connection?.identifier,
      integrationIdentifier: integration.identifier,
      providerId: integration.providerId,
      channel: integration.channel,
      resource: command.resource,
      type: command.type,
      endpoint: command.endpoint,
    });

    return channelEndpoint;
  }

  private async assertResourceExists(command: CreateChannelEndpointCommand) {
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
    return `chendp-${shortId(6)}`;
  }
}

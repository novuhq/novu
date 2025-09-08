import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, shortId } from '@novu/application-generic';
import {
  ChannelAddressEntity,
  ChannelAddressRepository,
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ProvidersIdEnum, parseResourceKey } from '@novu/shared';
import { mapChannelAddressEntityToDto } from '../../dtos/dto.mapper';
import { GetChannelAddressResponseDto } from '../../dtos/get-channel-address-response.dto';
import { CreateChannelAddressCommand } from './create-channel-address.command';

@Injectable()
export class CreateChannelAddress {
  constructor(
    private readonly channelAddressRepository: ChannelAddressRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateChannelAddressCommand): Promise<GetChannelAddressResponseDto> {
    const integration = await this.findIntegration(command);

    await this.assertResourceExists(command);

    const identifier = command.identifier || this.generateIdentifier();

    // Check if channel address already exists
    const existingChannelAddress = await this.channelAddressRepository.findOne({
      identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (existingChannelAddress) {
      throw new ConflictException(
        `Channel address with identifier "${identifier}" already exists in environment "${command.environmentId}"`
      );
    }

    let connection: ChannelConnectionEntity | null = null;

    if (command.connectionIdentifier) {
      connection = await this.findChannelConnection(command);
    }

    const channelAddress = await this.createChannelAddress(command, identifier, integration, connection);

    return mapChannelAddressEntityToDto(channelAddress);
  }

  private async createChannelAddress(
    command: CreateChannelAddressCommand,
    identifier: string,
    integration: IntegrationEntity,
    connection: ChannelConnectionEntity | null
  ): Promise<ChannelAddressEntity> {
    const channelAddress = await this.channelAddressRepository.create({
      identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      connectionIdentifier: connection?.identifier,
      integrationIdentifier: integration.identifier,
      providerId: integration.providerId,
      channel: integration.channel,
      resource: command.resource,
      type: command.type,
      address: command.address,
    });

    return channelAddress;
  }

  private async assertResourceExists(command: CreateChannelAddressCommand) {
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

  private async findIntegration(command: CreateChannelAddressCommand) {
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

  private async findChannelConnection(command: CreateChannelAddressCommand): Promise<ChannelConnectionEntity> {
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
    return `chaddr-${shortId(6)}`;
  }
}

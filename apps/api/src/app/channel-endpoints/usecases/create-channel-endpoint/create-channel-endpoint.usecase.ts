import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, shortId } from '@novu/application-generic';
import {
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelEndpointResponseDto } from '../../dtos/get-channel-endpoint-response.dto';
import { CreateChannelEndpointCommand } from './create-channel-endpoint.command';

@Injectable()
export class CreateChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateChannelEndpointCommand): Promise<GetChannelEndpointResponseDto> {
    const { integration, subscriber } = await this.validateEntitiesExists(command);

    const identifier = command.identifier || this.generateIdentifier(integration.identifier, subscriber.subscriberId);

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

    const channelEndpoint = await this.createChannelEndpoint(command, identifier, integration, subscriber);

    return this.mapChannelEndpointEntityToDto(channelEndpoint, integration);
  }

  private async createChannelEndpoint(
    command: CreateChannelEndpointCommand,
    identifier: string,
    integration: IntegrationEntity,
    subscriber: SubscriberEntity
  ): Promise<ChannelEndpointEntity> {
    const channelEndpoint = await this.channelEndpointRepository.create({
      identifier,
      _integrationId: integration._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      subscriberId: subscriber.subscriberId,
      endpoint: command.endpoint,
      routing: command.routing,
    });

    return channelEndpoint;
  }

  private mapChannelEndpointEntityToDto(
    channelEndpoint: ChannelEndpointEntity,
    integration: IntegrationEntity
  ): GetChannelEndpointResponseDto {
    return {
      identifier: channelEndpoint.identifier,
      channel: integration.channel,
      provider: integration.providerId as ProvidersIdEnum,
      integrationIdentifier: integration.identifier,
      endpoint: channelEndpoint.endpoint,
      routing: channelEndpoint.routing,
      createdAt: channelEndpoint.createdAt,
      updatedAt: channelEndpoint.updatedAt,
    };
  }

  private async validateEntitiesExists(command: CreateChannelEndpointCommand) {
    const [integration, subscriber] = await Promise.all([
      this.integrationRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.integrationIdentifier,
      }),
      this.subscriberRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        subscriberId: command.subscriberId,
      }),
    ]);

    if (!integration) {
      throw new NotFoundException(`Integration not found: ${command.integrationIdentifier}`);
    }

    if (!subscriber) {
      throw new NotFoundException(`Subscriber not found: ${command.subscriberId}`);
    }

    return { integration, subscriber };
  }

  private generateIdentifier(integrationIdentifier: string, subscriberId: string): string {
    return `${integrationIdentifier}-${subscriberId}-${shortId(6)}`;
  }
}

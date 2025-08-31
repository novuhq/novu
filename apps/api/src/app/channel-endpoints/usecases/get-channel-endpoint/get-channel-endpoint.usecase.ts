import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { SubscriberResponseDto } from '../../../subscribers/dtos';
import { GetChannelEndpointResponseDto } from '../../dtos/get-channel-endpoint-response.dto';
import { GetChannelEndpointCommand } from './get-channel-endpoint.command';

@Injectable()
export class GetChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetChannelEndpointCommand): Promise<GetChannelEndpointResponseDto> {
    const subscriber = await this.validateSubscriberExists(command);
    const channelEndpoint = await this.fetchChannelEndpoint(command, subscriber);

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier '${command.identifier}' not found`);
    }

    const integration = await this.integrationRepository.findOne({
      _id: channelEndpoint._integrationId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    return this.mapChannelEndpointToDto(channelEndpoint, integration);
  }

  private async validateSubscriberExists(command: GetChannelEndpointCommand): Promise<SubscriberResponseDto> {
    const subscriber = await this.subscriberRepository.findOne({
      subscriberId: command.subscriberId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id '${command.subscriberId}' not found`);
    }

    return subscriber;
  }

  private async fetchChannelEndpoint(command: GetChannelEndpointCommand, subscriber: SubscriberResponseDto) {
    return await this.channelEndpointRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      subscriberId: subscriber.subscriberId,
      identifier: command.identifier,
    });
  }

  private mapChannelEndpointToDto(
    endpoint: ChannelEndpointEntity,
    integration: IntegrationEntity | null
  ): GetChannelEndpointResponseDto {
    return {
      identifier: endpoint.identifier,
      channel: integration?.channel ?? null,
      provider: (integration?.providerId as ProvidersIdEnum) ?? null,
      integrationIdentifier: integration?.identifier ?? null,
      endpoint: endpoint.endpoint,
      routing: endpoint.routing,
      createdAt: endpoint.createdAt,
      updatedAt: endpoint.updatedAt,
    };
  }
}

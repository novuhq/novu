import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelConnectionRepository, ChannelEndpointRepository } from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import { DeleteChannelEndpointCommand } from './delete-channel-endpoint.command';

@Injectable()
export class DeleteChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteChannelEndpointCommand): Promise<void> {
    const channelEndpoint = await this.channelEndpointRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier '${command.identifier}' not found`);
    }

    await this.channelEndpointRepository.delete({
      _id: channelEndpoint._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    // PagerDuty endpoints own their linked ChannelConnection 1:1 (no other endpoint
    // shares the connection), so cascade the delete so the encrypted routing key
    // is dropped alongside the endpoint. For any other endpoint type the linked
    // connection is either workspace-shared (Slack, Teams OAuth) or provisioned
    // out-of-band, so it must survive endpoint deletion.
    if (channelEndpoint.type === ENDPOINT_TYPES.PAGERDUTY_SERVICE && channelEndpoint.connectionIdentifier) {
      await this.channelConnectionRepository.delete({
        identifier: channelEndpoint.connectionIdentifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      });
    }
  }
}

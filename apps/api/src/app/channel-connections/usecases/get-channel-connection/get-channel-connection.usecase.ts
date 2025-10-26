import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelConnectionEntity, ChannelConnectionRepository } from '@novu/dal';
import { GetChannelConnectionCommand } from './get-channel-connection.command';

@Injectable()
export class GetChannelConnection {
  constructor(private readonly channelConnectionRepository: ChannelConnectionRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelConnectionCommand): Promise<ChannelConnectionEntity> {
    const channelConnection = await this.channelConnectionRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      resource: command.resource,
      integrationIdentifier: command.integrationIdentifier,
    });

    if (!channelConnection) {
      throw new NotFoundException(
        `Channel connection with resource '${command.resource}' and integration '${command.integrationIdentifier}' not found`
      );
    }

    return channelConnection;
  }
}

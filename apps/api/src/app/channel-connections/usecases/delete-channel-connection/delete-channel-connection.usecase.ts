import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelConnectionRepository } from '@novu/dal';
import { assertCanManageSharedConnections, isSharedConnection } from '../channel-connection.utils';
import { DeleteChannelConnectionCommand } from './delete-channel-connection.command';

@Injectable()
export class DeleteChannelConnection {
  constructor(private readonly channelConnectionRepository: ChannelConnectionRepository) {}

  @InstrumentUsecase()
  async execute(command: DeleteChannelConnectionCommand): Promise<void> {
    const channelConnection = await this.channelConnectionRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      ...(command.channelConnectionId ? { _id: command.channelConnectionId } : {}),
    });

    if (!channelConnection) {
      throw new NotFoundException(`Channel connection with identifier '${command.identifier}' not found`);
    }

    if (isSharedConnection(channelConnection)) {
      assertCanManageSharedConnections(command.canManageSharedConnections !== false);
    }

    await this.channelConnectionRepository.delete({
      _id: channelConnection._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });
  }
}

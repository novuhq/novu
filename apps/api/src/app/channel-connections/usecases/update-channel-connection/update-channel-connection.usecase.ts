import { Injectable, NotFoundException } from '@nestjs/common';
import { encryptChannelConnectionAuth, InstrumentUsecase } from '@novu/application-generic';
import { ChannelConnectionEntity, ChannelConnectionRepository, IntegrationRepository } from '@novu/dal';
import { AuthDto } from '../../dtos/shared.dto';
import { validateAndNormalizeConnectionAuth } from '../channel-connection.utils';
import { UpdateChannelConnectionCommand } from './update-channel-connection.command';

@Injectable()
export class UpdateChannelConnection {
  constructor(
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdateChannelConnectionCommand): Promise<ChannelConnectionEntity> {
    const auth = await this.resolveAuth(command);
    const updatedChannelConnection = await this.updateChannelConnection(command, auth);

    return updatedChannelConnection;
  }

  /**
   * Validates rotating auth against the connection's integration before persisting.
   * Only does the extra lookups when a `refreshToken` is present.
   */
  private async resolveAuth(command: UpdateChannelConnectionCommand): Promise<AuthDto> {
    if (!command.auth.refreshToken) {
      return command.auth;
    }

    const connection = await this.channelConnectionRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!connection) {
      throw new NotFoundException(`Channel connection with identifier "${command.identifier}" not found`);
    }

    const integration = await this.integrationRepository.findOne({
      identifier: connection.integrationIdentifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!integration) {
      throw new NotFoundException(`Integration "${connection.integrationIdentifier}" not found`);
    }

    return validateAndNormalizeConnectionAuth(command.auth, integration);
  }

  private async updateChannelConnection(
    command: UpdateChannelConnectionCommand,
    auth: AuthDto
  ): Promise<ChannelConnectionEntity> {
    const channelConnection = await this.channelConnectionRepository.findOneAndUpdate(
      {
        identifier: command.identifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      {
        workspace: command.workspace,
        auth: encryptChannelConnectionAuth(auth),
      },
      {
        new: true,
      }
    );

    if (!channelConnection) {
      throw new NotFoundException(`Channel connection with identifier "${command.identifier}" not found`);
    }

    return channelConnection;
  }
}

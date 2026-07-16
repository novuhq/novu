import { Injectable, NotFoundException } from '@nestjs/common';
import { encryptChannelConnectionAuth, InstrumentUsecase, validateEndpointForType } from '@novu/application-generic';
import { ChannelConnectionRepository, ChannelEndpointEntity, ChannelEndpointRepository } from '@novu/dal';
import { ConnectionBackedEndpointConfig, getConnectionBackedEndpointConfig } from '../../connection-backed-endpoints';
import { UpdateChannelEndpointCommand } from './update-channel-endpoint.command';

@Injectable()
export class UpdateChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdateChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    // Check if the channel endpoint exists
    const existingChannelEndpoint = await this.channelEndpointRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!existingChannelEndpoint) {
      throw new NotFoundException(
        `Channel endpoint with identifier "${command.identifier}" not found in environment "${command.environmentId}"`
      );
    }

    // Validate that the new endpoint matches the existing type
    validateEndpointForType(existingChannelEndpoint.type, command.endpoint);

    const connectionBackedConfig = getConnectionBackedEndpointConfig(existingChannelEndpoint.type);
    if (connectionBackedConfig) {
      return await this.updateConnectionBackedEndpoint(command, existingChannelEndpoint, connectionBackedConfig);
    }

    const updatedChannelEndpoint = await this.updateChannelEndpoint(command);

    return updatedChannelEndpoint;
  }

  private async updateChannelEndpoint(command: UpdateChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    const channelEndpoint = await this.channelEndpointRepository.findOneAndUpdate(
      {
        identifier: command.identifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      {
        endpoint: command.endpoint,
      },
      {
        new: true,
      }
    );

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier "${command.identifier}" not found`);
    }

    return channelEndpoint;
  }

  /**
   * Rotate the secret / region on the linked `ChannelConnection.auth`. The
   * endpoint document itself stays empty — the wire shape lives on the
   * connection. On response, hydrate the wire shape (e.g.
   * `endpoint: { routingKey, region }`) so the caller sees the updated values
   * without a follow-up GET.
   */
  private async updateConnectionBackedEndpoint(
    command: UpdateChannelEndpointCommand,
    existing: ChannelEndpointEntity,
    config: ConnectionBackedEndpointConfig
  ): Promise<ChannelEndpointEntity> {
    const wireEndpoint = command.endpoint as Record<string, unknown>;

    if (!existing.connectionIdentifier) {
      throw new NotFoundException(
        `${config.label} endpoint "${command.identifier}" has no linked connection; delete and recreate it`
      );
    }

    const updatedConnection = await this.channelConnectionRepository.findOneAndUpdate(
      {
        identifier: existing.connectionIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        auth: encryptChannelConnectionAuth({ ...wireEndpoint }),
      },
      { new: true }
    );

    if (!updatedConnection) {
      throw new NotFoundException(
        `Channel connection "${existing.connectionIdentifier}" not found for ${config.label} endpoint "${command.identifier}"`
      );
    }

    // Bump updatedAt on the endpoint even though its stored `endpoint` is empty,
    // so callers see a fresh timestamp reflecting the rotation.
    const refreshed = await this.channelEndpointRepository.findOneAndUpdate(
      {
        identifier: command.identifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      { endpoint: {} },
      { new: true }
    );

    if (!refreshed) {
      throw new NotFoundException(`Channel endpoint "${command.identifier}" not found after connection update`);
    }

    return { ...refreshed, endpoint: { ...wireEndpoint } } as ChannelEndpointEntity;
  }
}

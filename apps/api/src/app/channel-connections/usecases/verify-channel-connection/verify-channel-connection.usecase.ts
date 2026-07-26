import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, RotatingConnectionTokenService } from '@novu/application-generic';
import { ChannelConnectionEntity, ChannelConnectionRepository } from '@novu/dal';
import { VerifyChannelConnectionCommand } from './verify-channel-connection.command';

/**
 * Forces an immediate check (and, for rotating providers, exchange) of a channel
 * connection's stored auth against the provider — used after a manual refresh-token
 * paste so a stale or already-used token surfaces an error right away instead of
 * only being discovered on the next real send.
 *
 * Delegates entirely to `RotatingConnectionTokenService.getConnectionToken`, the same
 * path automatic pre-send refresh uses (same per-connection lock, same persistence),
 * so there is no separate exchange implementation to keep in sync.
 */
@Injectable()
export class VerifyChannelConnection {
  constructor(
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly rotatingConnectionTokenService: RotatingConnectionTokenService
  ) {}

  @InstrumentUsecase()
  async execute(command: VerifyChannelConnectionCommand): Promise<ChannelConnectionEntity> {
    const channelConnection = await this.findConnection(command);

    // `forceRefresh` guarantees a real provider exchange (or an error) instead of letting the call
    // short-circuit to the stored token when it loses the refresh lock — otherwise verify could report
    // success without ever validating the freshly pasted refresh token.
    await this.rotatingConnectionTokenService.getConnectionToken(channelConnection, { forceRefresh: true });

    // getConnectionToken persists a refreshed auth pair on the connection document when it
    // refreshes; re-read so the response reflects the new token/expiry rather than stale data.
    return await this.findConnection(command);
  }

  private async findConnection(command: VerifyChannelConnectionCommand): Promise<ChannelConnectionEntity> {
    const channelConnection = await this.channelConnectionRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!channelConnection) {
      throw new NotFoundException(`Channel connection with identifier '${command.identifier}' not found`);
    }

    return channelConnection;
  }
}

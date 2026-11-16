import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, ChannelConnectionRepository, ChannelEndpointRepository } from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import { RemoveSlackWorkspaceInstallationCommand } from './remove-slack-workspace-installation.command';

/** Endpoints that send with the workspace bot token. Incoming-webhook endpoints have their own URL and stay. */
const SLACK_BOT_ENDPOINT_TYPES = [ENDPOINT_TYPES.SLACK_USER, ENDPOINT_TYPES.SLACK_CHANNEL];

/**
 * Forgets a Slack workspace that removed the app: its channel connections and the
 * `slack_user` / `slack_channel` endpoints bound to them. When no connection is left
 * for the integration, every agent link to it stops showing Connected.
 *
 * Safe to run again for the same workspace. Slack resends an event that did not get a
 * 2xx, and a resend after the rows are gone still clears `connectedAt`.
 */
@Injectable()
export class RemoveSlackWorkspaceInstallation {
  constructor(
    private readonly logger: PinoLogger,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: RemoveSlackWorkspaceInstallationCommand): Promise<void> {
    const scope = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      integrationIdentifier: command.integrationIdentifier,
    };

    const connections = await this.channelConnectionRepository.find(
      { ...scope, 'workspace.id': command.workspaceId },
      'identifier'
    );
    const identifiers = connections.map((connection) => connection.identifier);

    let endpointsRemoved = 0;
    let connectionsRemoved = 0;
    if (identifiers.length > 0) {
      // Endpoints first: if the connection delete fails, a resend still finds the connections and finishes.
      const endpoints = await this.channelEndpointRepository.delete({
        ...scope,
        connectionIdentifier: { $in: identifiers },
        type: { $in: SLACK_BOT_ENDPOINT_TYPES },
      });
      const removed = await this.channelConnectionRepository.delete({ ...scope, identifier: { $in: identifiers } });
      endpointsRemoved = endpoints.deletedCount;
      connectionsRemoved = removed.deletedCount;
    }

    const remaining = await this.channelConnectionRepository.count(scope);
    if (remaining === 0) {
      await this.agentIntegrationRepository.update(
        {
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          _integrationId: command.integrationId,
        },
        { $set: { connectedAt: null } }
      );
    }

    this.logger.info(
      {
        workspaceId: command.workspaceId,
        integrationIdentifier: command.integrationIdentifier,
        connectionsRemoved,
        endpointsRemoved,
        remaining,
      },
      'Removed Slack workspace installation after app uninstall'
    );
  }
}

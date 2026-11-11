import { decryptChannelConnectionAuth, type PinoLogger } from '@novu/application-generic';
import type { AgentIntegrationRepository, ChannelConnectionRepository, ChannelEndpointRepository } from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

const SLACK_ENDPOINT_TYPES = [ENDPOINT_TYPES.SLACK_USER, ENDPOINT_TYPES.SLACK_CHANNEL] as const;

export interface SlackAppUninstallDeps {
  channelConnectionRepository: ChannelConnectionRepository;
  channelEndpointRepository: ChannelEndpointRepository;
  agentIntegrationRepository: AgentIntegrationRepository;
  logger: Pick<PinoLogger, 'info'>;
}

export interface SlackAppUninstallInput {
  adapterName: string;
  action: string;
  workspaceId: string;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
  integrationId: string;
  connectionAccessToken?: string;
}

export interface SlackAppUninstallResult {
  connectionsRemoved: number;
  endpointsRemoved: number;
  evictCachedInstance: boolean;
}

interface SlackUninstallChatEvent {
  adapter: { name: string };
  action: string;
  conversationId: string;
}

export interface SlackUninstallCache {
  config: {
    environmentId: string;
    organizationId: string;
    integrationIdentifier: string;
    integrationId: string;
    connectionAccessToken?: string;
  };
  adapterFingerprint: string;
}

const NOTHING_REMOVED: SlackAppUninstallResult = {
  connectionsRemoved: 0,
  endpointsRemoved: 0,
  evictCachedInstance: false,
};

/**
 * Slack `app_uninstalled` for one workspace.
 *
 * Deletes that workspace's channel connections and the `slack_user` / `slack_channel`
 * endpoints bound to them. When no connection remains for the integration, clears
 * `connectedAt` on its agent links. An Enterprise Grid org-wide install sends
 * `enterprise_id` as the conversation id, while OAuth stores `team.id`, so that id
 * matches nothing and this returns without deleting.
 */
export async function handleSlackAppUninstalled(
  deps: SlackAppUninstallDeps,
  input: SlackAppUninstallInput
): Promise<SlackAppUninstallResult> {
  if (input.adapterName !== 'slack' || input.action !== 'remove') {
    return NOTHING_REMOVED;
  }

  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) {
    return NOTHING_REMOVED;
  }

  const scope = {
    _environmentId: input.environmentId,
    _organizationId: input.organizationId,
    integrationIdentifier: input.integrationIdentifier,
  };
  const connections = await deps.channelConnectionRepository.find(
    { ...scope, 'workspace.id': workspaceId },
    'identifier auth'
  );

  if (connections.length === 0) {
    deps.logger.info(
      {
        workspaceId,
        integrationIdentifier: input.integrationIdentifier,
        connectionsRemoved: 0,
        endpointsRemoved: 0,
      },
      'Slack app uninstall matched no workspace connection'
    );

    return NOTHING_REMOVED;
  }

  const identifiers = connections.map((connection) => connection.identifier);
  const tokenMatched = connections.some((connection) => {
    const accessToken = decryptChannelConnectionAuth(connection.auth)?.accessToken;

    return Boolean(input.connectionAccessToken) && accessToken === input.connectionAccessToken;
  });
  const endpointResult = await deps.channelEndpointRepository.delete({
    _environmentId: input.environmentId,
    _organizationId: input.organizationId,
    integrationIdentifier: input.integrationIdentifier,
    connectionIdentifier: { $in: identifiers },
    type: { $in: [...SLACK_ENDPOINT_TYPES] },
  });
  const connectionResult = await deps.channelConnectionRepository.delete({
    ...scope,
    'workspace.id': workspaceId,
  });
  const remaining = await deps.channelConnectionRepository.count(scope);

  if (remaining === 0) {
    await deps.agentIntegrationRepository.update(
      {
        _environmentId: input.environmentId,
        _organizationId: input.organizationId,
        _integrationId: input.integrationId,
      },
      { $set: { connectedAt: null } }
    );
  }

  const connectionsRemoved = connectionResult.deletedCount;
  const endpointsRemoved = endpointResult.deletedCount;

  deps.logger.info(
    {
      workspaceId,
      integrationIdentifier: input.integrationIdentifier,
      connectionsRemoved,
      endpointsRemoved,
    },
    'Removed Slack workspace connections after app uninstall'
  );

  return {
    connectionsRemoved,
    endpointsRemoved,
    evictCachedInstance: connectionsRemoved > 0 && (tokenMatched || remaining === 0),
  };
}

/**
 * Registers `chat.onUninstalled` for Slack only. A stale adapter fingerprint makes
 * the next `getOrCreate` rebuild the cached Chat instance. Shutting it down here
 * would run while this uninstall handler is still on that instance.
 */
export function attachSlackUninstallHandler(input: {
  platform: AgentPlatformEnum;
  chat: { onUninstalled(handler: (event: SlackUninstallChatEvent) => Promise<void>): void };
  cached: SlackUninstallCache;
  deps: SlackAppUninstallDeps;
  onError: (err: unknown, workspaceId: string) => void;
}): void {
  if (input.platform !== AgentPlatformEnum.SLACK) {
    return;
  }

  input.chat.onUninstalled(async (event) => {
    try {
      const result = await handleSlackAppUninstalled(input.deps, {
        adapterName: event.adapter.name,
        action: event.action,
        workspaceId: event.conversationId,
        environmentId: input.cached.config.environmentId,
        organizationId: input.cached.config.organizationId,
        integrationIdentifier: input.cached.config.integrationIdentifier,
        integrationId: input.cached.config.integrationId,
        connectionAccessToken: input.cached.config.connectionAccessToken,
      });

      if (result.evictCachedInstance) {
        input.cached.adapterFingerprint = `uninstalled:${event.conversationId}`;
      }
    } catch (err) {
      input.onError(err, event.conversationId);
    }
  });
}

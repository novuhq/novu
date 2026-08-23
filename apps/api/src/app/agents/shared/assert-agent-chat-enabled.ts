import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

const AGENT_CHAT_DISABLED_CONNECT_MESSAGE = 'Agent Chat is not enabled for this workspace. Contact support@novu.co';

async function isAgentChatFeatureEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<boolean> {
  return featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_AGENT_WEB_CHAT_ENABLED,
    defaultValue: false,
    organization: { _id: organizationId },
    environment: { _id: environmentId },
  });
}

/**
 * Gates subscriber agent-chat HTTP (`/v1/agent-chat/*`) on `IS_AGENT_WEB_CHAT_ENABLED`.
 * Shared by Nest `AgentChatEnabledGuard` (GET) and the POST create path (no AuthGuard).
 */
export async function assertAgentChatEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isEnabled = await isAgentChatFeatureEnabled(featureFlagsService, organizationId, environmentId);

  if (!isEnabled) {
    throw new NotFoundException();
  }
}

/** Connect CLI / dashboard provisioning — clear error instead of a silent 404. */
export async function assertAgentChatEnabledForConnect(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isEnabled = await isAgentChatFeatureEnabled(featureFlagsService, organizationId, environmentId);

  if (!isEnabled) {
    throw new ForbiddenException(AGENT_CHAT_DISABLED_CONNECT_MESSAGE);
  }
}

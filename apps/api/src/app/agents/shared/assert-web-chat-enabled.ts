import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

const WEB_CHAT_DISABLED_CONNECT_MESSAGE = 'Web Chat is not enabled for this workspace. Contact support@novu.co';

async function isWebChatFeatureEnabled(
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
 * Gates subscriber web-chat HTTP (`/v1/web-chat/*`) on `IS_AGENT_WEB_CHAT_ENABLED`.
 * Shared by Nest `WebChatEnabledGuard` (GET) and the POST create path (no AuthGuard).
 */
export async function assertWebChatEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isEnabled = await isWebChatFeatureEnabled(featureFlagsService, organizationId, environmentId);

  if (!isEnabled) {
    throw new NotFoundException();
  }
}

/** Connect CLI / dashboard provisioning — clear error instead of a silent 404. */
export async function assertWebChatEnabledForConnect(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isEnabled = await isWebChatFeatureEnabled(featureFlagsService, organizationId, environmentId);

  if (!isEnabled) {
    throw new ForbiddenException(WEB_CHAT_DISABLED_CONNECT_MESSAGE);
  }
}

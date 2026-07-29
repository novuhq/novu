import { NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

/**
 * Gates subscriber web-chat HTTP (`/v1/web-chat/*`) on `IS_AGENT_WEB_CHAT_ENABLED`.
 * Shared by Nest `WebChatEnabledGuard` (GET) and the POST create path (no AuthGuard).
 */
export async function assertWebChatEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isEnabled = await featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_AGENT_WEB_CHAT_ENABLED,
    defaultValue: false,
    organization: { _id: organizationId },
    environment: { _id: environmentId },
  });

  if (!isEnabled) {
    throw new NotFoundException();
  }
}

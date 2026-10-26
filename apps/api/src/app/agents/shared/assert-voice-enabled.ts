import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

const VOICE_DISABLED_CONNECT_MESSAGE = 'Voice is not enabled for this workspace. Contact support@novu.co';

const VOICE_DISABLED_SEND_MESSAGE = 'Voice is not enabled for this workspace.';

export async function isVoiceFeatureEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<boolean> {
  return featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_AGENT_VOICE_ENABLED,
    defaultValue: false,
    organization: { _id: organizationId },
    environment: { _id: environmentId },
  });
}

/** `via: voice` on a send. A 404 with a message the agent can read, matching web chat's subscriber gate. */
export async function assertVoiceEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isEnabled = await isVoiceFeatureEnabled(featureFlagsService, organizationId, environmentId);

  if (!isEnabled) {
    throw new NotFoundException(VOICE_DISABLED_SEND_MESSAGE);
  }
}

/** `channel add voice`. A 403, so the CLI can tell a disabled workspace from a missing route. */
export async function assertVoiceEnabledForConnect(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isEnabled = await isVoiceFeatureEnabled(featureFlagsService, organizationId, environmentId);

  if (!isEnabled) {
    throw new ForbiddenException(VOICE_DISABLED_CONNECT_MESSAGE);
  }
}

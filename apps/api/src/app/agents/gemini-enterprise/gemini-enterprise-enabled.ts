import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

/** Cloud-only PoC: never enabled on self-hosted, whatever the flag source says. */
export async function isGeminiEnterpriseEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<boolean> {
  if (process.env.IS_SELF_HOSTED === 'true') {
    return false;
  }

  return featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_AGENT_GEMINI_ENTERPRISE_ENABLED,
    defaultValue: false,
    organization: { _id: organizationId },
    environment: { _id: environmentId },
  });
}

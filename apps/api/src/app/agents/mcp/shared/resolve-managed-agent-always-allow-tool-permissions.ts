import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

/**
 * Per-org rollout gate for provisioning managed agents with permissive
 * tool/MCP defaults. When enabled, upstream toolsets are created with
 * `always_allow` permission policies instead of the default `always_ask`.
 */
export async function resolveManagedAgentAlwaysAllowToolPermissions(args: {
  featureFlagsService: FeatureFlagsService;
  environmentId: string;
  organizationId: string;
}): Promise<boolean> {
  return args.featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_AGENT_DEFAULT_MCP_ALWAYS_ALLOW_ENABLED,
    defaultValue: false,
    environment: { _id: args.environmentId },
    organization: { _id: args.organizationId },
  });
}

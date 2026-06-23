import { ForbiddenException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

/**
 * Per-org rollout gate for `authMode === 'provider-managed'` MCP entries.
 *
 * Asserts `IS_MCP_PROVIDER_MANAGED_ENABLED` is on for the given (env, org)
 * tuple — defaults to `false` so an LD outage cannot accidentally open the
 * flow — and throws the standard `mcp_provider_managed_disabled`
 * `ForbiddenException` otherwise. Lifted out of the new ensure-vault usecase
 * so the EnableAgentMcpServer write path can share one error contract and a
 * single rollout switch.
 */
export async function assertMcpProviderManagedFlagEnabled(args: {
  featureFlagsService: FeatureFlagsService;
  mcpId: string;
  environmentId: string;
  organizationId: string;
}): Promise<void> {
  const enabled = await args.featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_MCP_PROVIDER_MANAGED_ENABLED,
    defaultValue: false,
    environment: { _id: args.environmentId },
    organization: { _id: args.organizationId },
  });

  if (!enabled) {
    throw new ForbiddenException({
      statusCode: 403,
      message: `MCP "${args.mcpId}" is managed by the agent runtime provider, which is not enabled for this organization.`,
      error: 'mcp_provider_managed_disabled',
    });
  }
}

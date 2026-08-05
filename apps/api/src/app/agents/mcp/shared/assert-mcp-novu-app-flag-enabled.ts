import { ForbiddenException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

/**
 * Per-org rollout gate for `authMode === 'novu-app'` MCP entries.
 *
 * Asserts `IS_MCP_NOVU_APP_ENABLED` is on for the given (env, org) tuple
 * — defaults to `false` so an LD outage cannot accidentally open the flow
 * — and throws the standard `mcp_novu_app_disabled` `ForbiddenException`
 * otherwise. Lifted out of the enable + authorize-url usecases so both
 * code paths share one error contract and a single rollout switch.
 */
export async function assertMcpNovuAppFlagEnabled(args: {
  featureFlagsService: FeatureFlagsService;
  mcpId: string;
  environmentId: string;
  organizationId: string;
}): Promise<void> {
  const enabled = await args.featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_MCP_NOVU_APP_ENABLED,
    defaultValue: false,
    environment: { _id: args.environmentId },
    organization: { _id: args.organizationId },
  });

  if (!enabled) {
    throw new ForbiddenException({
      statusCode: 403,
      message: `MCP "${args.mcpId}" requires the novu-app integration which is not enabled for this organization.`,
      error: 'mcp_novu_app_disabled',
    });
  }
}

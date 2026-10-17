import type { ConnectClaimTokenService } from '../connect/services/connect-claim-token.service';
import { getKeylessAgentClaimTokenTtlSeconds, getKeylessAgentEnvironmentExpiresAt } from './keyless-agent-environment';
import { buildConnectClaimUrl } from './keyless-signup.helpers';

/**
 * Agent environments are always claimed on the main dashboard (never the Human
 * dashboard) so the claim runs the workflow copy. The link is valid until the
 * environment itself expires.
 */
export async function resolveKeylessAgentClaimUrl(
  connectClaimTokenService: ConnectClaimTokenService,
  params: { environmentId: string; organizationId: string; createdAt: Date | string }
): Promise<{ claimUrl: string; expiresAt: string }> {
  const { token } = await connectClaimTokenService.issueOrGetForEnvironment(
    { env: params.environmentId, org: params.organizationId },
    { ttlSeconds: getKeylessAgentClaimTokenTtlSeconds(params.createdAt) }
  );

  return {
    claimUrl: buildConnectClaimUrl(token),
    expiresAt: getKeylessAgentEnvironmentExpiresAt(params.createdAt).toISOString(),
  };
}

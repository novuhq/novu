import type { PinoLogger } from '@novu/application-generic';
import type { ConnectClaimTokenService } from '../connect/services/connect-claim-token.service';
import { buildHumanClaimUrl } from './keyless-signup.helpers';

/**
 * The "sign up to keep this" link for a keyless environment. A setup that
 * cannot mint a token still gets told to sign up, just without a link, so
 * every caller treats a missing URL as a normal outcome.
 */
export async function resolveKeylessClaimUrl(
  connectClaimTokenService: ConnectClaimTokenService,
  params: { environmentId: string; organizationId: string },
  logger: PinoLogger
): Promise<string | undefined> {
  try {
    const { token } = await connectClaimTokenService.issueOrGetForEnvironment({
      env: params.environmentId,
      org: params.organizationId,
    });

    return buildHumanClaimUrl(token);
  } catch (err) {
    logger.warn({ err, environmentId: params.environmentId }, 'Failed to issue keyless claim token');

    return undefined;
  }
}

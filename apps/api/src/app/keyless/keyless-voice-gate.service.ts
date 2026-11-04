import { ForbiddenException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConnectClaimTokenService } from '../connect/services/connect-claim-token.service';
import { resolveKeylessClaimUrl } from './keyless-claim-url';
import { isKeylessOrganization } from './keyless-organization.helpers';
import { isHumanBrowserLoginAvailable } from './keyless-signup.helpers';

/** Machine-readable code on the 403, so the CLI can point at `human login`. */
export const KEYLESS_VOICE_REQUIRES_ACCOUNT_CODE = 'KEYLESS_VOICE_REQUIRES_ACCOUNT';

/**
 * Keyless setups may not place calls. A phone call spends money and rings a real number,
 * and an unclaimed demo has no account to bill or to ban.
 */
@Injectable()
export class KeylessVoiceGateService {
  constructor(
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  isBlocked(organizationId: string): boolean {
    return isKeylessOrganization(organizationId);
  }

  async assertAllowed(params: { environmentId: string; organizationId: string }): Promise<void> {
    if (!this.isBlocked(params.organizationId)) {
      return;
    }

    const claimUrl = await resolveKeylessClaimUrl(this.connectClaimTokenService, params, this.logger);
    const browserLogin = isHumanBrowserLoginAvailable();

    throw new ForbiddenException({
      code: KEYLESS_VOICE_REQUIRES_ACCOUNT_CODE,
      message: browserLogin
        ? 'Outbound calls need an Agent Inbox account. Run `npx @agentinbox/cli login` to claim this setup.'
        : 'Outbound calls need a Novu account. Sign up to claim this setup.',
      browserLogin,
      ...(claimUrl ? { claimUrl } : {}),
    });
  }
}

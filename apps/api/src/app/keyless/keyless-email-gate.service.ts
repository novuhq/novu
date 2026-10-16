import { ForbiddenException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { HumanContactRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import type { CardElement } from 'chat';
import { normalizeEmailForLookup } from '../agents/shared/util/email-normalization';
import { ConnectClaimTokenService } from '../connect/services/connect-claim-token.service';
import { resolveKeylessClaimUrl } from './keyless-claim-url';
import { isKeylessOrganization } from './keyless-organization.helpers';
import { buildKeylessEmailClaimCard, isHumanBrowserLoginAvailable } from './keyless-signup.helpers';

/** Machine-readable code on the 403, so `@novu/human` can point at `human login`. */
export const KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE = 'KEYLESS_EMAIL_REQUIRES_ACCOUNT';

/** Once-per-environment flag for the claim email. Not an inbox-quota key. */
export function keylessEmailClaimCtaKey(environmentId: string): string {
  return `human-email:${environmentId}`;
}

/**
 * Keyless setups may receive email but may not start any. The exceptions are the
 * operator's own verification email and the claim reply the inbound handler sends.
 */
@Injectable()
export class KeylessEmailGateService {
  constructor(
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  isBlocked(organizationId: string): boolean {
    return isKeylessOrganization(organizationId);
  }

  /**
   * Throws when the organization is keyless. A missing claim token still throws:
   * the operator is told to sign up, just without a link.
   */
  async assertAllowed(params: { environmentId: string; organizationId: string }): Promise<void> {
    if (!this.isBlocked(params.organizationId)) {
      return;
    }

    const claimUrl = await this.resolveClaimUrl(params);
    const browserLogin = isHumanBrowserLoginAvailable();

    throw new ForbiddenException({
      code: KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE,
      message: browserLogin
        ? 'Outbound email needs an Agent Inbox account. Run `npx @agentinbox/cli login` to claim this setup.'
        : 'Outbound email needs a Novu account. Sign up to claim this setup.',
      browserLogin,
      ...(claimUrl ? { claimUrl } : {}),
    });
  }

  /**
   * A keyless setup may verify only the operator's own declared address. Returns the
   * claim link to put in that verification email (undefined for a real organization,
   * or when no token could be issued).
   */
  async assertOperatorVerificationAllowed(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    address: string;
  }): Promise<{ claimUrl?: string }> {
    if (!this.isBlocked(params.organizationId)) {
      return {};
    }

    const operator = await this.humanContactRepository.findOperator(params.environmentId, params.agentId);
    const declared = await this.declaredOperatorAddress(params.environmentId, params.agentId);
    const isOperatorAddress =
      operator?.subscriberId === params.subscriberId && declared === normalizeEmailForLookup(params.address);

    if (!isOperatorAddress) {
      await this.assertAllowed(params);
    }

    const claimUrl = await this.resolveClaimUrl(params);

    return claimUrl ? { claimUrl } : {};
  }

  /**
   * The one email a keyless inbox may send: a claim card, to the operator's own
   * declared address, once per environment. Returns undefined whenever the inbox
   * must stay silent — a different sender, a claim already sent, or no token.
   */
  async resolveOperatorClaimCard(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    sender: string;
  }): Promise<CardElement | undefined> {
    const declared = await this.declaredOperatorAddress(params.environmentId, params.agentId);
    if (!declared || declared !== normalizeEmailForLookup(params.sender)) {
      return undefined;
    }

    // Take the once-flag before the card exists, so two inboxes cannot both send.
    const ctaKey = keylessEmailClaimCtaKey(params.environmentId);
    let acquired = false;
    try {
      acquired = await this.connectClaimTokenService.tryMarkSignupCtaPosted(ctaKey);
    } catch (err) {
      this.logger.warn({ err, environmentId: params.environmentId }, 'Failed to reserve the keyless email claim');

      return undefined;
    }

    if (!acquired) {
      return undefined;
    }

    const claimUrl = await this.resolveClaimUrl(params);
    if (!claimUrl) {
      await this.connectClaimTokenService.releaseSignupCtaPosted(ctaKey).catch(() => undefined);

      return undefined;
    }

    return buildKeylessEmailClaimCard(claimUrl);
  }

  /** The address the operator typed at setup, normalized, or null when they have not. */
  private async declaredOperatorAddress(environmentId: string, agentId: string): Promise<string | null> {
    const operator = await this.humanContactRepository.findOperator(environmentId, agentId);
    const declared = operator?.addresses?.[HumanChannelViaEnum.EMAIL]?.declared?.address;

    return declared ? normalizeEmailForLookup(declared) : null;
  }

  private resolveClaimUrl(params: { environmentId: string; organizationId: string }): Promise<string | undefined> {
    return resolveKeylessClaimUrl(this.connectClaimTokenService, params, this.logger);
  }
}

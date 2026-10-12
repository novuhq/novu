import { ForbiddenException, Injectable } from '@nestjs/common';
import { HumanContactRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import type { CardElement } from 'chat';
import { normalizeEmailForLookup } from '../agents/shared/util/email-normalization';
import { ConnectClaimTokenService } from '../connect/services/connect-claim-token.service';
import { isKeylessOrganization } from './keyless-organization.helpers';
import { buildHumanClaimUrl, buildKeylessEmailClaimCard } from './keyless-signup.helpers';

/** Machine-readable code on the 403, so `@novu/human` can point at `human login`. */
export const KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE = 'KEYLESS_EMAIL_REQUIRES_ACCOUNT';

/** Once-per-environment flag for the claim email. Not an inbox-quota key. */
export function keylessEmailClaimCtaKey(environmentId: string): string {
  return `human-email:${environmentId}`;
}

/** `human login` is approved on the Human dashboard, so it only works where one is configured. */
export function isHumanBrowserLoginAvailable(): boolean {
  return Boolean(process.env.HUMAN_DASHBOARD_URL?.trim());
}

/**
 * Keyless setups may receive email but may not start any. The exceptions are the
 * operator's own verification email and the claim reply the inbound handler sends.
 */
@Injectable()
export class KeylessEmailGateService {
  constructor(
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly humanContactRepository: HumanContactRepository
  ) {}

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
        ? 'Outbound email needs a Human account. Run `human login` to claim this setup.'
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
    const declared = operator?.addresses?.[HumanChannelViaEnum.EMAIL]?.declared?.address;
    const isOperatorAddress =
      operator?.subscriberId === params.subscriberId &&
      Boolean(declared) &&
      normalizeEmailForLookup(declared as string) === normalizeEmailForLookup(params.address);

    if (!isOperatorAddress) {
      await this.assertAllowed(params);
    }

    const claimUrl = await this.resolveClaimUrl(params);

    return claimUrl ? { claimUrl } : {};
  }

  buildClaimCard(claimUrl: string): CardElement {
    return buildKeylessEmailClaimCard(claimUrl);
  }

  /** The address the operator typed at setup, or null when they have not. */
  async findDeclaredOperatorAddress(environmentId: string, agentId: string): Promise<string | null> {
    const operator = await this.humanContactRepository.findOperator(environmentId, agentId);
    const address = operator?.addresses?.[HumanChannelViaEnum.EMAIL]?.declared?.address;

    return address ?? null;
  }

  private async resolveClaimUrl(params: {
    environmentId: string;
    organizationId: string;
  }): Promise<string | undefined> {
    try {
      const { token } = await this.connectClaimTokenService.issueOrGetForEnvironment({
        env: params.environmentId,
        org: params.organizationId,
      });

      return buildHumanClaimUrl(token);
    } catch {
      return undefined;
    }
  }
}

import { HttpException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { HumanInteractionRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import type { ReplyContentDto } from '../../agents/shared/dtos/agent-reply-payload.dto';
import { ConnectClaimTokenService } from '../../connect/services/connect-claim-token.service';
import { resolveKeylessHumanInteractionCap } from '../../keyless/keyless-abuse.constants';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';
import { buildHumanClaimUrl, buildKeylessHumanSignupCard } from '../../keyless/keyless-signup.helpers';
import { HumanDeliveryService } from './human-delivery.service';

/** Machine-readable code on the 429 body so `@novu/human` can branch without parsing prose. */
export const KEYLESS_HUMAN_CAP_REACHED_CODE = 'KEYLESS_HUMAN_CAP_REACHED';

/** `human login` is approved on the Human dashboard, so it only works where one is configured (not self-hosted). */
export function isHumanBrowserLoginAvailable(): boolean {
  return Boolean(process.env.HUMAN_DASHBOARD_URL?.trim());
}

export interface KeylessHumanCapParams {
  environmentId: string;
  organizationId: string;
  agentId: string;
  /** Who gets the one-time sign-up card when the cap is hit. */
  subscriberIds: string[];
  via?: HumanChannelViaEnum;
}

@Injectable()
export class HumanKeylessCapService {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly deliveryService: HumanDeliveryService,
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Keyless demo cap (`KEYLESS_HUMAN_INTERACTION_CAP`, counted across every
   * interaction the environment ever created). Past it, the human gets the
   * sign-up card on their channel — once per environment, so a retrying agent
   * does not spam them — and the caller gets a 429 carrying the same claim link.
   * No-op outside keyless organizations.
   */
  async assertWithinCap(params: KeylessHumanCapParams): Promise<void> {
    if (!isKeylessOrganization(params.organizationId)) {
      return;
    }

    const cap = resolveKeylessHumanInteractionCap();
    const used = await this.humanInteractionRepository.count({ _environmentId: params.environmentId });

    if (used < cap) {
      return;
    }

    const claimUrl = await this.resolveClaimUrl(params);
    await this.postSignupCta(params, claimUrl);

    const message = claimUrl
      ? `You've used the ${cap} free messages of this keyless demo. Sign up for a free Novu account to keep your channels and continue: ${claimUrl}`
      : `You've used the ${cap} free messages of this keyless demo. Sign up for a free Novu account to keep your channels and continue.`;

    throw new HttpException(
      {
        statusCode: 429,
        message,
        code: KEYLESS_HUMAN_CAP_REACHED_CODE,
        cap,
        ...(claimUrl ? { claimUrl } : {}),
        // Tells `@novu/human` whether `human login` works here, or the operator needs a secret key instead.
        browserLogin: isHumanBrowserLoginAvailable(),
      },
      429
    );
  }

  private async resolveClaimUrl(params: KeylessHumanCapParams): Promise<string | undefined> {
    try {
      const { token } = await this.connectClaimTokenService.issueOrGetForEnvironment({
        env: params.environmentId,
        org: params.organizationId,
      });

      return buildHumanClaimUrl(token);
    } catch (err) {
      this.logger.warn({ err, environmentId: params.environmentId }, 'Failed to issue keyless claim token');

      return undefined;
    }
  }

  private async postSignupCta(params: KeylessHumanCapParams, claimUrl: string | undefined): Promise<void> {
    if (!claimUrl) {
      return;
    }

    const ctaKey = `human:${params.environmentId}`;

    try {
      if (await this.connectClaimTokenService.isSignupCtaPosted(ctaKey)) {
        return;
      }

      const content = { card: buildKeylessHumanSignupCard(claimUrl) } as ReplyContentDto;
      let deliveredCount = 0;

      for (const subscriberId of params.subscriberIds) {
        try {
          const target = await this.deliveryService.resolveChannel({
            environmentId: params.environmentId,
            organizationId: params.organizationId,
            agentId: params.agentId,
            subscriberId,
            via: params.via,
          });
          await this.deliveryService.deliverContent(params.agentId, target, content);
          deliveredCount += 1;
        } catch (err) {
          this.logger.warn({ err, subscriberId }, 'Failed to deliver keyless signup CTA to one human');
        }
      }

      if (deliveredCount > 0) {
        await this.connectClaimTokenService.tryMarkSignupCtaPosted(ctaKey);
      }
    } catch (err) {
      this.logger.warn({ err, environmentId: params.environmentId }, 'Failed to post keyless signup CTA');
    }
  }
}

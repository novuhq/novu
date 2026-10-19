import { ConflictException, Injectable } from '@nestjs/common';
import { AgentRepository, HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';

import { HumanOperatorService } from '../../services/human-operator.service';
import type { HumanVerificationTokenPayload } from '../../services/human-verification-token.service';
import { maskEmail } from '../../services/mask-email';
import { type RelaySender, resolveRelaySender } from '../../services/relay-owner-name';

export type VerifyAddressResult = RelaySender & {
  verified: true;
  via: HumanChannelViaEnum;
  address: string;
};

/**
 * Promotes the pending slot a verification credential was issued for, then copies the
 * address onto the subscriber. The link and the code both call this, so either one
 * arriving second for the same `requestedAt` reports the same success.
 */
@Injectable()
export class ConfirmHumanAddress {
  constructor(
    private readonly humanContactRepository: HumanContactRepository,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly operatorService: HumanOperatorService
  ) {}

  async confirm(payload: HumanVerificationTokenPayload): Promise<VerifyAddressResult> {
    const address = await this.confirmAddress(payload);
    if (!address) {
      throw new ConflictException({
        code: 'verification_superseded',
        message: 'This verification is no longer current. Request a new one.',
      });
    }

    await this.syncSubscriberEmail(payload, address);

    return this.verifiedResult(payload, address);
  }

  /**
   * Promotes the pending slot. A retry after a failed subscriber write finds the address
   * already verified and continues instead of reporting the credential as superseded.
   */
  private async confirmAddress(payload: HumanVerificationTokenPayload): Promise<string | null> {
    const promoted = await this.humanContactRepository.promotePendingAddress({
      environmentId: payload.env,
      agentId: payload.agentId,
      subscriberId: payload.subscriberId,
      via: payload.via,
      address: payload.address,
      requestedAt: payload.requestedAt,
    });
    if (promoted) {
      return promoted.address;
    }

    const verified = await this.humanContactRepository.findVerifiedAddress(
      payload.env,
      payload.agentId,
      payload.subscriberId,
      payload.via
    );
    if (verified?.address === payload.address && verified.requestedAt === payload.requestedAt) {
      return verified.address;
    }

    return null;
  }

  /**
   * Copies the address that is verified right now onto the subscriber. A late writer
   * re-reads and follows a newer verification instead of leaving Subscriber.email
   * pointing at the address it just replaced.
   */
  private async syncSubscriberEmail(payload: HumanVerificationTokenPayload, fallbackAddress: string): Promise<void> {
    if (payload.via !== HumanChannelViaEnum.EMAIL) {
      return;
    }

    let written: string | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await this.humanContactRepository.findVerifiedAddress(
        payload.env,
        payload.agentId,
        payload.subscriberId,
        payload.via
      );
      const next = current?.address ?? (written ? undefined : fallbackAddress);
      if (!next || next === written) {
        return;
      }

      await this.subscriberRepository.update(
        { subscriberId: payload.subscriberId, _environmentId: payload.env },
        { $set: { email: next } }
      );
      written = next;
    }
  }

  private async verifiedResult(payload: HumanVerificationTokenPayload, address: string): Promise<VerifyAddressResult> {
    const [agent, operatorId] = await Promise.all([
      this.agentRepository.findOne(
        { _id: payload.agentId, _environmentId: payload.env, _organizationId: payload.org },
        ['name']
      ),
      this.operatorService.findForAgent({
        environmentId: payload.env,
        organizationId: payload.org,
        agentId: payload.agentId,
      }),
    ]);
    const operator = operatorId
      ? await this.subscriberRepository.findOne(
          { _environmentId: payload.env, subscriberId: operatorId },
          'firstName lastName'
        )
      : null;
    const sender = resolveRelaySender({ agent, operator });

    return {
      verified: true,
      ...sender,
      via: payload.via,
      address: maskEmail(address),
    };
  }
}

export function isVerificationSuperseded(err: unknown): boolean {
  if (!(err instanceof ConflictException)) {
    return false;
  }

  const response = err.getResponse();
  if (typeof response !== 'object' || response === null || !('code' in response)) {
    return false;
  }

  return response.code === 'verification_superseded';
}

import { ConflictException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository, HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import {
  type HumanVerificationTokenPayload,
  HumanVerificationTokenService,
  toVerificationHttpError,
} from '../../services/human-verification-token.service';
import { maskEmail } from '../../services/mask-email';
import { type RelaySender, resolveRelaySender } from '../../services/relay-owner-name';
import { VerifyAddressCommand } from './verify-address.command';

export type VerifyAddressResult = RelaySender & {
  verified: true;
  via: HumanChannelViaEnum;
  address: string;
};

/**
 * Claims a verification link and promotes the matching pending address on
 * HumanContact. Superseded links (pending replaced by a newer request) return
 * `verification_superseded` so the page can explain what happened.
 */
@Injectable()
export class VerifyAddress {
  constructor(
    private readonly verificationTokens: HumanVerificationTokenService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: VerifyAddressCommand): Promise<VerifyAddressResult> {
    let claimed: Awaited<ReturnType<HumanVerificationTokenService['claim']>>;
    try {
      claimed = await this.verificationTokens.claim(command.token);
    } catch (err) {
      throw toVerificationHttpError(err);
    }

    try {
      const address = await this.confirmAddress(claimed.payload);
      if (!address) {
        throw new ConflictException({
          code: 'verification_superseded',
          message: 'This verification link is no longer current. Request a new one from the invite page.',
        });
      }

      await this.syncSubscriberEmail(claimed.payload, address);

      return await this.verifiedResult(claimed.payload, address);
    } catch (err) {
      if (!isSuperseded(err)) {
        await this.verificationTokens.release(command.token, claimed).catch(() => undefined);
      }

      throw err;
    }
  }

  /**
   * Promotes the pending slot. A retry after a failed subscriber write finds
   * the address already verified and continues instead of reporting the link
   * as superseded.
   */
  private async confirmAddress(payload: HumanVerificationTokenPayload): Promise<string | null> {
    const promoted = await this.humanContactRepository.promotePendingAddress({
      environmentId: payload.env,
      agentId: payload.agentId,
      subscriberId: payload.subscriberId,
      via: payload.via,
      address: payload.address,
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
    if (verified?.address === payload.address) {
      return verified.address;
    }

    return null;
  }

  /**
   * Copies the address that is verified right now onto the subscriber. A late
   * writer re-reads and follows a newer verification instead of leaving
   * Subscriber.email pointing at the address it just replaced.
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
    const agent = await this.agentRepository.findOne(
      { _id: payload.agentId, _environmentId: payload.env, _organizationId: payload.org },
      ['name', 'operatorSubscriberId']
    );
    const sender = await resolveRelaySender({
      agent,
      environmentId: payload.env,
      subscriberRepository: this.subscriberRepository,
    });

    return {
      verified: true,
      ...sender,
      via: payload.via,
      address: maskEmail(address),
    };
  }
}

function isSuperseded(err: unknown): boolean {
  if (!(err instanceof ConflictException)) {
    return false;
  }

  const response = err.getResponse();
  if (typeof response !== 'object' || response === null || !('code' in response)) {
    return false;
  }

  return response.code === 'verification_superseded';
}

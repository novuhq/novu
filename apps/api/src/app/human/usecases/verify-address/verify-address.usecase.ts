import { ConflictException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository, HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import {
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

    const { payload } = claimed;
    const promoted = await this.humanContactRepository.promotePendingAddress({
      environmentId: payload.env,
      agentId: payload.agentId,
      subscriberId: payload.subscriberId,
      via: payload.via,
      address: payload.address,
    });

    if (!promoted) {
      throw new ConflictException({
        code: 'verification_superseded',
        message: 'This verification link is no longer current. Request a new one from the invite page.',
      });
    }

    if (payload.via === HumanChannelViaEnum.EMAIL) {
      await this.subscriberRepository.update(
        { subscriberId: payload.subscriberId, _environmentId: payload.env },
        { $set: { email: promoted.address } }
      );
    }

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
      address: maskEmail(promoted.address),
    };
  }
}

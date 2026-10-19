import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanContactRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';

import { isValidEmailForLookup, normalizeEmailForLookup } from '../../../agents/shared/util/email-normalization';
import { HumanInviteTokenService } from '../../services/human-invite-token.service';
import {
  HumanVerificationCodeService,
  VERIFICATION_CODE_INVALID,
} from '../../services/human-verification-code.service';
import {
  ConfirmHumanAddress,
  isVerificationSuperseded,
  type VerifyAddressResult,
} from '../verify-address/confirm-human-address.service';
import { VerifyAddressByCodeCommand } from './verify-address-by-code.command';

/**
 * Confirms an address with the 6-digit code from the verification email.
 * The link stays valid: both promote the same pending slot, and a second success is idempotent.
 */
@Injectable()
export class VerifyAddressByCode {
  constructor(
    private readonly verificationCodes: HumanVerificationCodeService,
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly confirmAddress: ConfirmHumanAddress
  ) {}

  @InstrumentUsecase()
  async execute(command: VerifyAddressByCodeCommand): Promise<VerifyAddressResult> {
    const address = await this.resolveAddress(command);
    const redeemed = await this.verificationCodes.redeem(address, command.code, command.clientIp);

    try {
      return await this.confirmAddress.confirm(redeemed.payload);
    } catch (err) {
      if (!redeemed.alreadyUsed && !isVerificationSuperseded(err)) {
        await this.verificationCodes.release(address, command.code).catch(() => undefined);
      }

      throw err;
    }
  }

  private async resolveAddress(command: VerifyAddressByCodeCommand): Promise<string> {
    const hasAddress = Boolean(command.address?.trim());
    const hasInvite = Boolean(command.inviteToken?.trim());
    if (hasAddress === hasInvite) {
      throw new BadRequestException({
        code: 'verification_target_required',
        message: 'Send the email address or the invite token with the code.',
      });
    }

    if (hasAddress) {
      const address = normalizeEmailForLookup(command.address ?? '');
      if (!isValidEmailForLookup(address)) {
        throw invalidCode();
      }

      return address;
    }

    const invite = await this.inviteTokens.requireActive(command.inviteToken ?? '');
    const pending = await this.humanContactRepository.findPendingAddress(
      invite.payload.env,
      invite.payload.agentId,
      invite.payload.subscriberId,
      HumanChannelViaEnum.EMAIL
    );
    if (pending?.address) {
      return pending.address;
    }

    const verified = await this.humanContactRepository.findVerifiedAddress(
      invite.payload.env,
      invite.payload.agentId,
      invite.payload.subscriberId,
      HumanChannelViaEnum.EMAIL
    );
    if (verified?.address) {
      return verified.address;
    }

    throw invalidCode();
  }
}

function invalidCode(): UnauthorizedException {
  return new UnauthorizedException({
    code: VERIFICATION_CODE_INVALID,
    message: 'That code is wrong or has expired. Check the email, or send a new one.',
  });
}

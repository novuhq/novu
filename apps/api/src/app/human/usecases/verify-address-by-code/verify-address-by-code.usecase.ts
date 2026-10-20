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
import type { HumanVerificationTokenPayload } from '../../services/human-verification-token.service';
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
    const resolved = await this.resolveAddress(command);
    const redeemed = await this.verificationCodes.redeem(resolved.address, command.code, command.clientIp);

    if (!codeBelongsTo(redeemed.payload, resolved.expected, command.expectedRequestedAt)) {
      if (!redeemed.alreadyUsed) {
        await this.verificationCodes.release(resolved.address, command.code).catch(() => undefined);
      }

      throw invalidCode();
    }

    try {
      return await this.confirmAddress.confirm(redeemed.payload);
    } catch (err) {
      if (!redeemed.alreadyUsed && !isVerificationSuperseded(err)) {
        await this.verificationCodes.release(resolved.address, command.code).catch(() => undefined);
      }

      throw err;
    }
  }

  private async resolveAddress(command: VerifyAddressByCodeCommand): Promise<ResolvedVerification> {
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

      return { address, expected: expectedContact(command) };
    }

    const invite = await this.inviteTokens.requireActive(command.inviteToken ?? '');
    const expected = {
      env: invite.payload.env,
      agentId: invite.payload.agentId,
      subscriberId: invite.payload.subscriberId,
    };
    const pending = await this.humanContactRepository.findPendingAddress(
      expected.env,
      expected.agentId,
      expected.subscriberId,
      HumanChannelViaEnum.EMAIL
    );
    if (pending?.address) {
      return { address: pending.address, expected };
    }

    const verified = await this.humanContactRepository.findVerifiedAddress(
      expected.env,
      expected.agentId,
      expected.subscriberId,
      HumanChannelViaEnum.EMAIL
    );
    if (verified?.address) {
      return { address: verified.address, expected };
    }

    throw invalidCode();
  }
}

interface ExpectedContact {
  env: string;
  agentId: string;
  subscriberId: string;
}

interface ResolvedVerification {
  address: string;
  expected?: ExpectedContact;
}

function expectedContact(command: VerifyAddressByCodeCommand): ExpectedContact | undefined {
  if (!command.expectedEnv || !command.expectedAgentId || !command.expectedSubscriberId) {
    return undefined;
  }

  return {
    env: command.expectedEnv,
    agentId: command.expectedAgentId,
    subscriberId: command.expectedSubscriberId,
  };
}

/** A scoped caller only accepts the code issued for that contact and that send. */
function codeBelongsTo(
  payload: HumanVerificationTokenPayload,
  expected: ExpectedContact | undefined,
  expectedRequestedAt: string | undefined
): boolean {
  if (expectedRequestedAt && payload.requestedAt !== expectedRequestedAt) {
    return false;
  }

  if (!expected) {
    return true;
  }

  return (
    payload.env === expected.env &&
    payload.agentId === expected.agentId &&
    payload.subscriberId === expected.subscriberId
  );
}

function invalidCode(): UnauthorizedException {
  return new UnauthorizedException({
    code: VERIFICATION_CODE_INVALID,
    message: 'That code is wrong or has expired. Check the email, or send a new one.',
  });
}

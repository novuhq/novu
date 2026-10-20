import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';

import {
  HumanVerificationTokenService,
  toVerificationHttpError,
} from '../../services/human-verification-token.service';
import {
  ConfirmHumanAddress,
  isVerificationSuperseded,
  type VerifyAddressResult,
} from './confirm-human-address.service';
import { VerifyAddressCommand } from './verify-address.command';

export type { VerifyAddressResult } from './confirm-human-address.service';

/**
 * Claims a verification link and promotes the matching pending address on
 * HumanContact. Superseded links (pending replaced by a newer request) return
 * `verification_superseded` so the page can explain what happened.
 */
@Injectable()
export class VerifyAddress {
  constructor(
    private readonly verificationTokens: HumanVerificationTokenService,
    private readonly confirmAddress: ConfirmHumanAddress
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
      return await this.confirmAddress.confirm(claimed.payload);
    } catch (err) {
      if (!isVerificationSuperseded(err)) {
        await this.verificationTokens.release(command.token, claimed).catch(() => undefined);
      }

      throw err;
    }
  }
}

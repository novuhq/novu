import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanContactRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';

import { HumanOperatorService } from '../../services/human-operator.service';
import { VERIFICATION_CODE_INVALID } from '../../services/human-verification-code.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import type { VerifyAddressResult } from '../verify-address/confirm-human-address.service';
import { VerifyAddressByCodeCommand } from '../verify-address-by-code/verify-address-by-code.command';
import { VerifyAddressByCode } from '../verify-address-by-code/verify-address-by-code.usecase';
import { ConfirmOperatorEmailCommand } from './confirm-operator-email.command';

/**
 * The signed-in operator enters the code from their own verification email.
 * The pending address comes from their contact, not from the request.
 */
@Injectable()
export class ConfirmOperatorEmail {
  constructor(
    private readonly humanOperator: HumanOperatorService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly verifyAddressByCode: VerifyAddressByCode
  ) {}

  @InstrumentUsecase()
  async execute(command: ConfirmOperatorEmailCommand): Promise<VerifyAddressResult> {
    const { agentId, subscriberId } = await this.humanOperator.require({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
    });

    const pending = await this.humanContactRepository.findPendingAddress(
      command.environmentId,
      agentId,
      subscriberId,
      HumanChannelViaEnum.EMAIL
    );
    const verified = pending
      ? null
      : await this.humanContactRepository.findVerifiedAddress(
          command.environmentId,
          agentId,
          subscriberId,
          HumanChannelViaEnum.EMAIL
        );
    const address = pending?.address ?? verified?.address;
    if (!address) {
      throw new UnauthorizedException({
        code: VERIFICATION_CODE_INVALID,
        message: 'That code is wrong or has expired. Check the email, or send a new one.',
      });
    }

    return this.verifyAddressByCode.execute(
      VerifyAddressByCodeCommand.create({
        address,
        code: command.code,
        clientIp: command.clientIp,
        expectedEnv: command.environmentId,
        expectedAgentId: agentId,
        expectedSubscriberId: subscriberId,
      })
    );
  }
}

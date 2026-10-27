import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanContactRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { isValidEmailForLookup, normalizeEmailForLookup } from '../../../agents/shared/util/email-normalization';
import { HumanOperatorService } from '../../services/human-operator.service';
import { RequestAddressVerificationCommand } from '../request-address-verification/request-address-verification.command';
import {
  RequestAddressVerification,
  type RequestAddressVerificationResult,
} from '../request-address-verification/request-address-verification.usecase';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { ChangeOperatorEmailCommand } from './change-operator-email.command';

/**
 * The operator gives a new email address, or confirms the one they signed up with. It goes through the
 * same double opt-in as everyone else's: the address gets a confirmation link, and only once it is used
 * do agents email it. A verified address keeps working until then. Unlike `POST /human/verifications`,
 * nothing is set up and the default channel stays as the operator left it.
 */
@Injectable()
export class ChangeOperatorEmail {
  constructor(
    private readonly humanOperator: HumanOperatorService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly requestAddressVerification: RequestAddressVerification
  ) {}

  @InstrumentUsecase()
  async execute(command: ChangeOperatorEmailCommand): Promise<RequestAddressVerificationResult> {
    const address = normalizeEmailForLookup(command.address);
    if (!isValidEmailForLookup(address)) {
      throw new BadRequestException({ code: 'address_invalid', message: 'Enter a valid email address.' });
    }

    const { agentId, subscriberId } = await this.humanOperator.require({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
    });

    const verified = await this.humanContactRepository.findVerifiedAddress(
      command.environmentId,
      agentId,
      subscriberId,
      HumanChannelViaEnum.EMAIL
    );
    if (verified?.address === address) {
      throw new ConflictException({ code: 'address_already_verified', message: 'This email is already verified.' });
    }

    // Passing the agent is the invite page's path: it skips setup, which would also make email the default.
    return this.requestAddressVerification.execute(
      RequestAddressVerificationCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        agentId,
        subscriberId,
        via: HumanChannelViaEnum.EMAIL,
        address,
      })
    );
  }
}

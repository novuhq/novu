import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository, HumanContactRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { HumanInviteTokenService } from '../../services/human-invite-token.service';
import {
  HumanVoiceVerificationCodeService,
  type VoiceCodeCheck,
} from '../../services/human-voice-verification-code.service';
import { maskPhone } from '../../services/normalize-phone';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { ConfirmVoiceVerificationCommand } from './confirm-voice-verification.command';

export type ConfirmVoiceVerificationResult = {
  verified: true;
  via: HumanChannelViaEnum.VOICE;
  address: string;
};

/**
 * Promotes the pending phone number when the typed code matches the one the
 * call read. A short code is not a credential on its own: the public path
 * also requires the invite token, and the CLI path requires the caller's session.
 */
@Injectable()
export class ConfirmVoiceVerification {
  constructor(
    private readonly codes: HumanVoiceVerificationCodeService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly agentRepository: AgentRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ConfirmVoiceVerificationCommand): Promise<ConfirmVoiceVerificationResult> {
    const agentId = await this.agentIdOf(command);
    const key = {
      environmentId: command.environmentId,
      agentId,
      subscriberId: command.subscriberId,
    };
    const checked = await this.codes.check(key, command.code);
    if (!checked.ok) {
      throw rejected(checked);
    }

    const promoted = await this.humanContactRepository.promotePendingAddress({
      environmentId: command.environmentId,
      agentId,
      subscriberId: command.subscriberId,
      via: HumanChannelViaEnum.VOICE,
      address: checked.address,
      requestedAt: checked.requestedAt,
    });

    if (!promoted) {
      const verified = await this.humanContactRepository.findVerifiedAddress(
        command.environmentId,
        agentId,
        command.subscriberId,
        HumanChannelViaEnum.VOICE
      );
      const already = verified?.address === checked.address && verified.requestedAt === checked.requestedAt;
      if (!already) {
        await this.codes.clearIfCurrent(key, checked.requestedAt).catch(() => undefined);

        throw new ConflictException({
          code: 'verification_superseded',
          message: 'This code is no longer current. Request a new call from the invite page.',
        });
      }
    }

    await this.codes.clearIfCurrent(key, checked.requestedAt);

    return {
      verified: true,
      via: HumanChannelViaEnum.VOICE,
      address: maskPhone(checked.address),
    };
  }

  private async agentIdOf(command: ConfirmVoiceVerificationCommand): Promise<string> {
    if (command.agentId) {
      return command.agentId;
    }

    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;
    const agent = await this.agentRepository.findOne(
      {
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );
    if (!agent) {
      throw new NotFoundException(`Relay agent "${identifier}" was not found. Run \`human setup\` first.`);
    }

    return agent._id;
  }

  /** The invite page. The token names the contact; the code is what the call read. */
  async executeFromInvite(token: string, code: string): Promise<ConfirmVoiceVerificationResult> {
    const { payload } = await this.inviteTokens.requireActive(token);

    return this.execute(
      ConfirmVoiceVerificationCommand.create({
        environmentId: payload.env,
        organizationId: payload.org,
        agentId: payload.agentId,
        subscriberId: payload.subscriberId,
        code,
      })
    );
  }
}

function rejected(checked: Exclude<VoiceCodeCheck, { ok: true }>): BadRequestException {
  switch (checked.reason) {
    case 'mismatch':
      return new BadRequestException({
        code: 'verification_code_invalid',
        message: 'That code is not right.',
        attemptsRemaining: checked.attemptsRemaining,
      });
    case 'locked':
      return new BadRequestException({
        code: 'verification_code_locked',
        message: 'Too many wrong codes. Request a new call.',
      });
    case 'missing':
      return new BadRequestException({
        code: 'verification_code_expired',
        message: 'That code has expired. Request a new call.',
      });
    default: {
      const unreachable: never = checked;

      return unreachable;
    }
  }
}

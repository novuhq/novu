import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository, HumanContactRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { HumanInviteTokenService } from '../../services/human-invite-token.service';
import { HumanVoiceVerificationCodeService } from '../../services/human-voice-verification-code.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { RemoveVoiceAddressCommand } from './remove-voice-address.command';

/**
 * Drops a phone number, verified or still pending, and any code that would
 * promote it. Delivery stops immediately, including when voice was the default.
 */
@Injectable()
export class RemoveVoiceAddress {
  constructor(
    private readonly humanContactRepository: HumanContactRepository,
    private readonly codes: HumanVoiceVerificationCodeService,
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly agentRepository: AgentRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: RemoveVoiceAddressCommand): Promise<{ removed: true }> {
    const agentId = await this.agentIdOf(command);
    await this.humanContactRepository.clearVerifiedAddress({
      environmentId: command.environmentId,
      agentId,
      subscriberId: command.subscriberId,
      via: HumanChannelViaEnum.VOICE,
    });
    await this.codes.clear({
      environmentId: command.environmentId,
      agentId,
      subscriberId: command.subscriberId,
    });

    return { removed: true };
  }

  /** Decline the number from the invite page, before or after it is verified. */
  async executeFromInvite(token: string): Promise<{ removed: true }> {
    const { payload } = await this.inviteTokens.requireActive(token);

    return this.execute(
      RemoveVoiceAddressCommand.create({
        environmentId: payload.env,
        organizationId: payload.org,
        agentId: payload.agentId,
        subscriberId: payload.subscriberId,
      })
    );
  }

  private async agentIdOf(command: RemoveVoiceAddressCommand): Promise<string> {
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
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import type { HumanAgentResponseDto } from '../../dtos/human-agent.dto';
import { HumanAgentIdentityService } from '../../services/human-agent-identity.service';
import { HumanAgentPictureService } from '../../services/human-agent-picture.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { UpdateHumanAgentCommand } from './update-human-agent.command';

/**
 * Renames or describes the relay agent after `human setup` made it. The agents API refuses to touch a
 * relay agent, which keeps the rest of it (its runtime, who may write to it) out of reach; this changes
 * only who it is to the people it talks to.
 */
@Injectable()
export class UpdateHumanAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly humanAgentIdentity: HumanAgentIdentityService,
    private readonly humanAgentPicture: HumanAgentPictureService
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdateHumanAgentCommand): Promise<HumanAgentResponseDto> {
    if (command.name === undefined && command.description === undefined) {
      throw new BadRequestException('Pass a name, a description, or both.');
    }

    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;
    const existing = await this.agentRepository.findOne(
      { identifier, _environmentId: command.environmentId, _organizationId: command.organizationId },
      '*'
    );

    if (!existing || existing.runtime !== 'human_relay') {
      throw new NotFoundException('There is no Human agent yet. Run `human setup` first.');
    }

    const agent = await this.humanAgentIdentity.apply(existing, {
      name: command.name,
      description: command.description,
    });

    return this.humanAgentPicture.describe(agent);
  }
}

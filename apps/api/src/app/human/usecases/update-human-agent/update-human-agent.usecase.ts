import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentEntity, AgentRepository } from '@novu/dal';
import type { HumanAgentResponseDto } from '../../dtos/human-agent.dto';
import { HumanAgentIdentityService } from '../../services/human-agent-identity.service';
import { HumanAgentPictureService } from '../../services/human-agent-picture.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { UpdateHumanAgentCommand } from './update-human-agent.command';

/**
 * Changes the relay agent after `human setup` made it: who it is to the people it talks to (its name and
 * description), who can write to it, and whether it is paused. The agents API refuses to touch a relay
 * agent, which keeps the rest of it (its runtime, how it delivers) out of reach.
 *
 * Pausing keeps the time; pausing a paused agent again keeps the first one. The controller lets only the
 * operator's dashboard change who can reach the agent or pause it.
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
    if (
      command.name === undefined &&
      command.description === undefined &&
      command.reach === undefined &&
      command.paused === undefined
    ) {
      throw new BadRequestException('Pass a name, a description, who can reach the agent, or whether it is paused.');
    }

    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;
    const existing = await this.agentRepository.findOne(
      { identifier, _environmentId: command.environmentId, _organizationId: command.organizationId },
      '*'
    );

    if (!existing || existing.runtime !== 'human_relay') {
      throw new NotFoundException('There is no agent yet. Run `npx @agentinbox/cli setup` first.');
    }

    const agent = await this.humanAgentIdentity.apply(existing, {
      name: command.name,
      description: command.description,
    });

    return this.humanAgentPicture.describe(await this.applySettings(agent, command));
  }

  /**
   * Saves who can reach the agent and whether it is paused, when they differ, and returns the agent as it is
   * stored now. A pause is only written while the agent isn't paused yet, so two pauses at once keep the
   * first one's time.
   */
  private async applySettings(agent: AgentEntity, command: UpdateHumanAgentCommand): Promise<AgentEntity> {
    const changesReach = command.reach !== undefined && command.reach !== (agent.reach ?? 'anyone');
    const pauses = command.paused === true && !agent.pausedAt;
    const resumes = command.paused === false && Boolean(agent.pausedAt);

    if (!changesReach && !pauses && !resumes) {
      return agent;
    }

    const scope = { _id: agent._id, _environmentId: agent._environmentId, _organizationId: agent._organizationId };

    if (changesReach || resumes) {
      await this.agentRepository.updateOne(scope, {
        ...(changesReach ? { $set: { reach: command.reach } } : {}),
        ...(resumes ? { $unset: { pausedAt: 1 } } : {}),
      });
    }

    if (pauses) {
      await this.agentRepository.updateOne(
        { ...scope, pausedAt: { $exists: false } },
        { $set: { pausedAt: new Date().toISOString() } }
      );
    }

    return (await this.agentRepository.findOne(scope, '*')) ?? agent;
  }
}

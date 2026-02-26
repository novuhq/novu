import { Injectable, NotFoundException } from '@nestjs/common';
import { AiAgentTypeEnum } from '@novu/shared';
import { BaseStreamGenerationAgent } from '../types';
import { StreamWorkflowGenerationUseCase } from '../usecases/stream-workflow-generation';

@Injectable()
export class AiAgentFactory {
  private readonly agents: Map<AiAgentTypeEnum, BaseStreamGenerationAgent>;

  constructor(private readonly addStepsUseCase: StreamWorkflowGenerationUseCase) {
    this.agents = new Map<AiAgentTypeEnum, BaseStreamGenerationAgent>([
      [AiAgentTypeEnum.GENERATE_WORKFLOW, this.addStepsUseCase],
    ]);
  }

  getAgentUseCase(agentType: AiAgentTypeEnum): BaseStreamGenerationAgent {
    const agent = this.agents.get(agentType);

    if (!agent) {
      throw new NotFoundException(`No AI agent found for agent type: ${agentType}`);
    }

    return agent;
  }

  getSupportedAgentTypes(): AiAgentTypeEnum[] {
    return Array.from(this.agents.keys());
  }
}

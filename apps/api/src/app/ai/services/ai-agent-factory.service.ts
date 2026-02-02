import { Injectable, NotFoundException } from '@nestjs/common';
import { AiResourceTypeEnum } from '@novu/shared';
import { BaseStreamGenerationAgent } from '../types';
import { StreamWorkflowGenerationUseCase } from '../usecases/stream-workflow-generation';

@Injectable()
export class AiAgentFactory {
  private readonly agents: Map<AiResourceTypeEnum, BaseStreamGenerationAgent>;

  constructor(private readonly workflowGenerationAgent: StreamWorkflowGenerationUseCase) {
    this.agents = new Map<AiResourceTypeEnum, BaseStreamGenerationAgent>([
      [AiResourceTypeEnum.WORKFLOW, this.workflowGenerationAgent],
    ]);
  }

  getAgent(resourceType: AiResourceTypeEnum): BaseStreamGenerationAgent {
    const agent = this.agents.get(resourceType);

    if (!agent) {
      throw new NotFoundException(`No AI agent found for resource type: ${resourceType}`);
    }

    return agent;
  }

  getSupportedResourceTypes(): AiResourceTypeEnum[] {
    return Array.from(this.agents.keys());
  }
}

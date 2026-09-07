import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, NotificationTemplateRepository } from '@novu/dal';
import { AgentWorkflowInfoDto, GetAgentUsageResponseDto } from '../../../shared/dtos/get-agent-usage-response.dto';
import { GetAgentUsageCommand } from './get-agent-usage.command';

@Injectable()
export class GetAgentUsage {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly workflowRepository: NotificationTemplateRepository
  ) {}

  async execute(command: GetAgentUsageCommand): Promise<GetAgentUsageResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    const workflows = await this.workflowRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        'agent.identifier': command.identifier,
      },
      { name: 1, 'triggers.identifier': 1 }
    );

    const workflowInfos: AgentWorkflowInfoDto[] = workflows
      .filter((workflow) => Boolean(workflow.triggers?.[0]?.identifier))
      .map((workflow) => ({
        name: workflow.name,
        workflowId: workflow.triggers![0].identifier,
      }));

    return {
      workflows: workflowInfos,
    };
  }
}

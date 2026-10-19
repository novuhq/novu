import { Injectable } from '@nestjs/common';
import {
  InstrumentUsecase,
  ResolveAgentInboundAddresses,
  UpsertWorkflowCommand,
  UpsertWorkflowUseCase,
  WorkflowResponseDto,
} from '@novu/application-generic';

@Injectable()
export class UpsertWorkflow {
  constructor(
    private upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private resolveAgentInboundAddresses: ResolveAgentInboundAddresses
  ) {}

  @InstrumentUsecase()
  async execute(command: UpsertWorkflowCommand): Promise<WorkflowResponseDto> {
    if (command.workflowDto.agent) {
      await this.resolveAgentInboundAddresses.validateWorkflowAgentConfig({
        agent: command.workflowDto.agent,
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
      });
    }

    return this.upsertWorkflowUseCase.execute(command);
  }
}

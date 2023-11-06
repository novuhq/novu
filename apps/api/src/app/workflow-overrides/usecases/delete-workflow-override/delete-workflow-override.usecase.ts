import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkflowOverrideRepository } from '@novu/dal';
import { DeleteWorkflowOverrideCommand } from './delete-workflow-override.command';

@Injectable()
export class DeleteWorkflowOverride {
  constructor(private workflowOverrideRepository: WorkflowOverrideRepository) {}

  async execute(command: DeleteWorkflowOverrideCommand): Promise<boolean> {
    const workflowOverride = await this.workflowOverrideRepository.findOne({
      _environmentId: command.environmentId,
      _id: command._id,
    });

    if (!workflowOverride) {
      throw new NotFoundException(`Workflow Override with id ${command._id} not found`);
    }

    const deletedWorkflowOverride = await this.workflowOverrideRepository.delete({
      _environmentId: command.environmentId,
      _id: command._id,
    });

    if (!deletedWorkflowOverride?.acknowledged) {
      throw new Error(`Unexpected error: failed to delete workflow override with id ${command._id}`);
    }

    return true;
  }
}

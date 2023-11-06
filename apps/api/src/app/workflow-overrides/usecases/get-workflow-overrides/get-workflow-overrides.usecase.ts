import { Injectable } from '@nestjs/common';

import { WorkflowOverrideRepository } from '@novu/dal';
import { GetWorkflowOverridesCommand } from './get-workflow-overrides.command';
import { GetWorkflowOverridesResponseDto } from '../../dto/get-workflow-overrides-response.dto';

@Injectable()
export class GetWorkflowOverrides {
  constructor(private workflowOverrideRepository: WorkflowOverrideRepository) {}

  async execute(command: GetWorkflowOverridesCommand): Promise<GetWorkflowOverridesResponseDto> {
    const { data } = await this.workflowOverrideRepository.getList(
      {
        environmentId: command.environmentId,
        skip: command.page * command.limit,
        limit: command.limit,
      },
      { _workflowId: command._workflowId }
    );

    return {
      data: data,
      page: command.page,
      pageSize: command.limit,
      hasMore: data?.length === command.limit,
    };
  }
}

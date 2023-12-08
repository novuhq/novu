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
        skip: command.page * command.limit,
        limit: command.limit,
      },
      {
        environmentId: command.environmentId,
      }
    );

    return {
      data: data,
      page: command.page,
      pageSize: command.limit,
      hasMore: data?.length === command.limit,
    };
  }
}

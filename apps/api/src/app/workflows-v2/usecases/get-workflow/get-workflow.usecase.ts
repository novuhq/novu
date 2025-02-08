import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { StepResponseDto, UserSessionData, WorkflowResponseDto } from '@novu/shared';
import {
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  InstrumentUsecase,
  WorkflowInternalResponseDto,
} from '@novu/application-generic';

import { NotificationStepEntity } from '@novu/dal';
import { GetWorkflowCommand } from './get-workflow.command';
import { toResponseWorkflowDto } from '../../mappers/notification-template-mapper';
import { BuildStepDataUsecase } from '../build-step-data/build-step-data.usecase';
import { BuildStepDataCommand } from '../build-step-data/build-step-data.command';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private buildStepDataUsecase: BuildStepDataUsecase
  ) {}

  @InstrumentUsecase()
  async execute(command: GetWorkflowCommand): Promise<WorkflowResponseDto> {
    const workflowEntity = await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        userId: command.user._id,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
      })
    );

    const fullSteps = await this.getFullWorkflowSteps(workflowEntity, command.user);

    return toResponseWorkflowDto(workflowEntity, fullSteps);
  }

  private async getFullWorkflowSteps(
    workflow: WorkflowInternalResponseDto,
    user: UserSessionData
  ): Promise<StepResponseDto[]> {
    const stepPromises = workflow.steps.map((step: NotificationStepEntity & { _id: string }) =>
      this.buildStepForWorkflow(workflow, step, user)
    );

    return Promise.all(stepPromises);
  }

  private async buildStepForWorkflow(
    workflow: WorkflowInternalResponseDto,
    step: NotificationStepEntity & { _id: string },
    user: UserSessionData
  ): Promise<StepResponseDto> {
    try {
      return await this.buildStepDataUsecase.execute(
        BuildStepDataCommand.create({
          workflowIdOrInternalId: workflow._id,
          stepIdOrInternalId: step._id,
          user,
        })
      );
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to build workflow step',
        workflowId: workflow._id,
        stepId: step._id,
        error: error.message,
      });
    }
  }
}

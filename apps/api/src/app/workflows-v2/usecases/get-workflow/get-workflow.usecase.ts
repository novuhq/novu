import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { UserSessionData } from '@novu/shared';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';

import { GetWorkflowCommand } from './get-workflow.command';
import { toResponseWorkflowDto } from '../../mappers/notification-template-mapper';
import { BuildStepDataCommand, BuildStepDataUsecase } from '../build-step-data';
import { StepResponseDto, WorkflowResponseDto } from '../../dtos';
import { generatePayloadExample } from '../../util/generate-payload-example';
import { GetWorkflowWithPreferencesUseCase } from '../../../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.usecase';
import { GetWorkflowWithPreferencesCommand } from '../../../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.command';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private getWorkflowWithPreferencesUseCase: GetWorkflowWithPreferencesUseCase,
    private buildStepDataUsecase: BuildStepDataUsecase,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: GetWorkflowCommand): Promise<WorkflowResponseDto> {
    const workflowWithPreferences = await this.getWorkflowWithPreferencesUseCase.execute(
      GetWorkflowWithPreferencesCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
      })
    );

    const fullSteps = await this.getFullWorkflowSteps(workflowWithPreferences, command.user);
    const payloadExample = await generatePayloadExample(workflowWithPreferences);

    return toResponseWorkflowDto(workflowWithPreferences, fullSteps, payloadExample);
  }

  private async getFullWorkflowSteps(
    workflowWithPreferences: NotificationTemplateEntity,
    user: UserSessionData
  ): Promise<StepResponseDto[]> {
    const stepPromises = workflowWithPreferences.steps.map((step: NotificationStepEntity & { _id: string }) =>
      this.buildStepForWorkflow(workflowWithPreferences, step, user)
    );

    return Promise.all(stepPromises);
  }

  private async buildStepForWorkflow(
    workflow: NotificationTemplateEntity,
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

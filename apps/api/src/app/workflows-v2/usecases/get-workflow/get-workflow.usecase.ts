import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { WorkflowDataContainer } from '../../../shared/containers/workflow-data.container';
import { GetWorkflowWithPreferencesCommand } from '../../../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.command';
import { GetWorkflowWithPreferencesUseCase } from '../../../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.usecase';
import { StepResponseDto, WorkflowResponseDto } from '../../dtos';
import { toResponseWorkflowDto } from '../../mappers/notification-template-mapper';
import { generatePayloadExample } from '../../util/generate-payload-example';
import { BuildStepDataCommand, BuildStepDataUsecase } from '../build-step-data';
import { GetWorkflowCommand } from './get-workflow.command';

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
  async execute(
    command: GetWorkflowCommand,
    workflowDataContainer?: WorkflowDataContainer
  ): Promise<WorkflowResponseDto> {
    if (workflowDataContainer) {
      const cachedDto = workflowDataContainer.getWorkflowDto(
        command.workflowIdOrInternalId,
        command.user.environmentId
      );

      if (cachedDto) {
        this.logger.debug(`Using cached workflow DTO for ${command.workflowIdOrInternalId}`);

        return cachedDto;
      }
    }

    const workflowWithPreferences = await this.getWorkflowWithPreferencesUseCase.execute(
      GetWorkflowWithPreferencesCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
        userId: command.user._id,
      })
    );

    const fullSteps = await this.getFullWorkflowSteps(workflowWithPreferences, command.user);
    const payloadExample = await generatePayloadExample(workflowWithPreferences);

    const workflowDto = toResponseWorkflowDto(workflowWithPreferences, fullSteps, payloadExample);

    return workflowDto;
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

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Instrument, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  IntegrationEntity,
  IntegrationRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  IntegrationIssueEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
  StepTypeEnum,
  UserSessionData,
} from '@novu/shared';
import { merge } from 'es-toolkit/compat';
import { WorkflowDataContainer } from '../../../shared/containers/workflow-data.container';
import { GetWorkflowWithPreferencesCommand } from '../../../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.command';
import { GetWorkflowWithPreferencesUseCase } from '../../../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.usecase';
import { StepIssuesDto, StepResponseDto, WorkflowResponseDto } from '../../dtos';
import { toResponseWorkflowDto } from '../../mappers/notification-template-mapper';
import { generatePayloadExample } from '../../util/generate-payload-example';
import { BuildStepDataCommand, BuildStepDataUsecase } from '../build-step-data';
import { GetWorkflowCommand } from './get-workflow.command';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private getWorkflowWithPreferencesUseCase: GetWorkflowWithPreferencesUseCase,
    private buildStepDataUsecase: BuildStepDataUsecase,
    private integrationsRepository: IntegrationRepository,
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
    // Fetch all relevant integrations in a single query
    const requiredIntegrations = await this.fetchAllRelevantIntegrations(
      workflowWithPreferences.steps,
      user.environmentId,
      user.organizationId
    );

    const stepPromises = workflowWithPreferences.steps.map((step: NotificationStepEntity & { _id: string }) =>
      this.buildStepForWorkflow(workflowWithPreferences, step, user, requiredIntegrations)
    );

    return Promise.all(stepPromises);
  }

  @Instrument()
  private async fetchAllRelevantIntegrations(
    steps: NotificationStepEntity[],
    environmentId: string,
    organizationId: string
  ): Promise<IntegrationEntity[]> {
    // Extract unique channel types that need integrations
    const integrationRequiredChannelTypes = new Set<ChannelTypeEnum>();

    for (const step of steps) {
      const stepType = step.template?.type as StepTypeEnum;
      const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(stepType);
      if (channelType) {
        integrationRequiredChannelTypes.add(channelType);
      }
    }

    if (integrationRequiredChannelTypes.size === 0) {
      return [];
    }

    // Fetch all relevant integrations in a single query
    return this.integrationsRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      active: true,
      channel: { $in: Array.from(integrationRequiredChannelTypes) },
    });
  }

  private async buildStepForWorkflow(
    workflow: NotificationTemplateEntity,
    step: NotificationStepEntity & { _id: string },
    user: UserSessionData,
    availableIntegrations: IntegrationEntity[]
  ): Promise<StepResponseDto> {
    try {
      const stepResponse = await this.buildStepDataUsecase.execute(
        BuildStepDataCommand.create({
          workflowIdOrInternalId: workflow._id,
          stepIdOrInternalId: step._id,
          user,
        })
      );

      const runtimeIntegrationIssues = this.validateIntegrationFromCache(
        step.template?.type as StepTypeEnum,
        availableIntegrations
      );

      const combinedIssues = merge(stepResponse.issues || {}, runtimeIntegrationIssues);

      return {
        ...stepResponse,
        issues: Object.keys(combinedIssues).length > 0 ? combinedIssues : undefined,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to build workflow step',
        workflowId: workflow._id,
        stepId: step._id,
        error: error.message,
      });
    }
  }

  @Instrument()
  private validateIntegrationFromCache(
    stepType: StepTypeEnum,
    availableIntegrations: IntegrationEntity[]
  ): StepIssuesDto {
    const issues: StepIssuesDto = {};

    const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(stepType);
    if (!channelType) {
      return issues;
    }

    const primaryNeeded = stepType === StepTypeEnum.EMAIL || stepType === StepTypeEnum.SMS;

    // Find the relevant integration from the pre-fetched list
    const validIntegrationForStep = availableIntegrations.find((integration) => {
      const matchesChannel = integration.channel === channelType;
      const matchesPrimary = primaryNeeded ? integration.primary === true : true;

      return matchesChannel && matchesPrimary;
    });

    if (stepType === StepTypeEnum.IN_APP) {
      if (!validIntegrationForStep || !validIntegrationForStep.connected) {
        issues.integration = {
          [stepType]: [
            {
              issueType: IntegrationIssueEnum.MISSING_INTEGRATION,
              message: validIntegrationForStep
                ? 'Inbox is not connected. Please connect your Inbox integration.'
                : 'Missing active integration provider',
            },
          ],
        };
      }

      return issues;
    }

    if (!validIntegrationForStep) {
      issues.integration = {
        [stepType]: [
          {
            issueType: IntegrationIssueEnum.MISSING_INTEGRATION,
            message: `Missing active${primaryNeeded ? ' primary' : ''} integration provider`,
          },
        ],
      };
    }

    return issues;
  }
}

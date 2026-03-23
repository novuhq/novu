import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {
  BaseRepository,
  EnvironmentRepository,
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
import { PinoLogger } from 'nestjs-pino';
import { StepIssuesDto } from '../../dtos/step-issues.dto';
import { StepResponseDto } from '../../dtos/workflow/step.response.dto';
import { WorkflowResponseDto } from '../../dtos/workflow/workflow-response.dto';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { WorkflowDataContainer } from '../../services/workflow-data.container';
import { generatePayloadExample } from '../../utils/generate-payload-example';
import { toResponseWorkflowDto } from '../../utils/notification-template-mapper';
import { BuildStepDataCommand, BuildStepDataUsecase } from '../build-step-data';
import { GetWorkflowWithPreferencesCommand, GetWorkflowWithPreferencesUseCase } from '../get-workflow-with-preferences';
import { GetWorkflowCommand } from './get-workflow.command';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private getWorkflowWithPreferencesUseCase: GetWorkflowWithPreferencesUseCase,
    private buildStepDataUsecase: BuildStepDataUsecase,
    private integrationsRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(
    command: GetWorkflowCommand,
    workflowDataContainer?: WorkflowDataContainer
  ): Promise<WorkflowResponseDto> {
    const effectiveEnvironmentId = await this.resolveEnvironmentId(command);

    const user: UserSessionData = {
      ...command.user,
      environmentId: effectiveEnvironmentId,
    };

    if (workflowDataContainer) {
      const cachedDto = workflowDataContainer.getWorkflowDto(command.workflowIdOrInternalId, effectiveEnvironmentId);

      if (cachedDto) {
        this.logger.debug(`Using cached workflow DTO for ${command.workflowIdOrInternalId}`);

        return cachedDto;
      }
    }

    const workflowWithPreferences = await this.getWorkflowWithPreferencesUseCase.execute(
      GetWorkflowWithPreferencesCommand.create({
        environmentId: effectiveEnvironmentId,
        organizationId: command.user.organizationId,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
        userId: command.user._id,
      })
    );

    const fullSteps = await this.getFullWorkflowSteps(workflowWithPreferences, user);
    const payloadExample = await generatePayloadExample(workflowWithPreferences);

    const workflowDto = toResponseWorkflowDto(workflowWithPreferences, fullSteps, payloadExample);

    return workflowDto;
  }

  private async resolveEnvironmentId(command: GetWorkflowCommand): Promise<string> {
    const { environmentId } = command;

    if (!environmentId || environmentId === command.user.environmentId) {
      return command.user.environmentId;
    }

    if (!BaseRepository.isInternalId(environmentId)) {
      throw new BadRequestException(`Invalid environment ID format: ${environmentId}`);
    }

    const environment = await this.environmentRepository.findByIdAndOrganization(
      environmentId,
      command.user.organizationId
    );

    if (!environment) {
      throw new NotFoundException(`Environment ${environmentId} not found`);
    }

    return environmentId;
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

    const stepPromises = workflowWithPreferences.steps.map((step) =>
      this.buildStepForWorkflow(
        workflowWithPreferences,
        step as NotificationStepEntity & { _id: string },
        user,
        requiredIntegrations
      )
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
        error: error instanceof Error ? error.message : 'Unknown error',
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

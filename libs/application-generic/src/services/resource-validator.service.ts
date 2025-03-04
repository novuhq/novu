import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CommunityOrganizationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  NotificationTemplateRepository,
  OrganizationEntity,
} from '@novu/dal';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';

import { NotificationStep } from '../usecases';
import { FeatureFlagsService } from './feature-flags';

export const MAX_WORKFLOWS_LIMIT = 100;
export const MAX_STEPS_PER_WORKFLOW = 10;

@Injectable()
export class ResourceValidatorService {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private organizationRepository: CommunityOrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private featureFlagService: FeatureFlagsService
  ) {}

  async validateStepsLimit(environmentId: string, steps: NotificationStep[]): Promise<void> {
    const isMaxStepsPerWorkflowEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_MAX_STEPS_PER_WORKFLOW_ENABLED,
      environment: { _id: environmentId },
      defaultValue: false,
    });

    if (!isMaxStepsPerWorkflowEnabled) {
      return;
    }

    if (steps.length > MAX_STEPS_PER_WORKFLOW) {
      throw new BadRequestException({
        message: `Workflow steps limit exceeded. Maximum allowed steps is ${MAX_STEPS_PER_WORKFLOW}, but got ${steps.length} steps.`,
        providedStepsCount: steps.length,
        maxSteps: MAX_STEPS_PER_WORKFLOW,
      });
    }
  }

  async validateWorkflowLimit(environmentId: string): Promise<void> {
    const workflowsCount = await this.notificationTemplateRepository.count({
      _environmentId: environmentId,
    });

    const environment = await this.getEnvironment(environmentId);
    const organization = await this.getOrganization(environment._organizationId);

    const maxWorkflowLimit = await this.getWorkflowLimit(environment, organization);

    if (workflowsCount >= maxWorkflowLimit) {
      throw new BadRequestException({
        message: 'Workflow limit exceeded. Please contact us to support more workflows.',
        currentCount: workflowsCount,
        limit: maxWorkflowLimit,
      });
    }
  }

  private async getWorkflowLimit(environment: EnvironmentEntity, organization: OrganizationEntity) {
    const maxWorkflowSystemLimit = await this.getMaxWorkflowSystemLimit(environment, organization);
    const maxWorkflowsTierLimit = await this.getMaxWorkflowsTierLimit(environment, organization);

    return Math.min(maxWorkflowSystemLimit, maxWorkflowsTierLimit);
  }

  private async getMaxWorkflowsTierLimit(environment, organization) {
    const q1TieringFlagValue = await this.getQ1TieringFlag(environment, organization);

    return getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      organization.apiServiceLevel || ApiServiceLevelEnum.FREE,
      { [FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED]: q1TieringFlagValue },
      false
    );
  }

  private async getMaxWorkflowSystemLimit(environment, organization) {
    return await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER,
      defaultValue: MAX_WORKFLOWS_LIMIT,
      environment,
      organization,
    });
  }

  private async getQ1TieringFlag(environment: EnvironmentEntity, organization: OrganizationEntity): Promise<boolean> {
    return await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED,
      defaultValue: true,
      environment,
      organization,
    });
  }

  private async getEnvironment(environmentId: string) {
    const environment = await this.environmentRepository.findOne({ _id: environmentId });

    if (!environment) {
      throw new BadRequestException({
        message: 'Environment not found',
      });
    }

    return environment;
  }

  private async getOrganization(organizationId: string) {
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new BadRequestException({
        message: 'Organization not found',
      });
    }

    return organization;
  }
}

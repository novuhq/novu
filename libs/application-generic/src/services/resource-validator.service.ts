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
@Injectable()
export class ResourceValidatorService {
  private readonly MAX_STEPS_PER_WORKFLOW = 10;
  private readonly DISABLED_FLAG_VALUE = -1;

  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private organizationRepository: CommunityOrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private featureFlagService: FeatureFlagsService
  ) {}

  async validateStepsLimit(environmentId: string, steps: NotificationStep[]): Promise<void> {
    const environment = await this.getEnvironment(environmentId);

    const isMaxStepsPerWorkflowEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_MAX_STEPS_PER_WORKFLOW_ENABLED,
      environment: { _id: environment._id },
      defaultValue: false,
    });

    if (!isMaxStepsPerWorkflowEnabled) {
      return;
    }

    if (steps.length > this.MAX_STEPS_PER_WORKFLOW) {
      throw new BadRequestException({
        message: `Workflow steps limit exceeded. Maximum allowed steps is ${this.MAX_STEPS_PER_WORKFLOW}, but got ${steps.length} steps.`,
        providedStepsCount: steps.length,
        maxSteps: this.MAX_STEPS_PER_WORKFLOW,
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

    if (maxWorkflowLimit === this.DISABLED_FLAG_VALUE) {
      return;
    }

    if (workflowsCount >= maxWorkflowLimit) {
      throw new BadRequestException({
        message: 'Workflow limit exceeded. Please contact us to support more workflows.',
        currentCount: workflowsCount,
        limit: maxWorkflowLimit,
      });
    }
  }

  private async getWorkflowLimit(environment: EnvironmentEntity, organization: OrganizationEntity) {
    const valueFromFlag = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER,
      defaultValue: this.DISABLED_FLAG_VALUE,
      environment,
      organization,
    });
    const maxWorkflowsFromTier = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      organization.apiServiceLevel || ApiServiceLevelEnum.FREE,
      {},
      false
    );
    if (valueFromFlag === this.DISABLED_FLAG_VALUE) {
      return Math.min(MAX_WORKFLOWS_LIMIT, maxWorkflowsFromTier);
    }

    return valueFromFlag;
  }

  private async getEnvironment(environmentId: string) {
    const environment = await this.environmentRepository.findOne({
      _id: environmentId,
    });

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

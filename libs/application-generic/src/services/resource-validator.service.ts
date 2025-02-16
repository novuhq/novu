import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EnvironmentEntity,
  EnvironmentRepository,
  NotificationTemplateRepository,
  OrganizationRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { NotificationStep } from '../usecases';
import {
  GetFeatureFlagCommand,
  GetFeatureFlagService,
} from '../usecases/feature-flag';
import { GetFeatureFlagNumberCommand } from '../usecases/feature-flag/get-feature-flag/get-feature-flag.command';

@Injectable()
export class ResourceValidatorService {
  private readonly MAX_STEPS_PER_WORKFLOW = 10;
  private readonly MAX_WORKFLOWS_LIMIT = 100;

  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private organizationRepository: OrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private getFeatureFlag: GetFeatureFlagService,
  ) {}

  async validateStepsLimit(environmentId: string, steps: NotificationStep[]) {
    const environment = await this.getEnvironment(environmentId);

    const isMaxStepsPerWorkflowEnabled = await this.getFeatureFlag.getBoolean(
      GetFeatureFlagCommand.create({
        key: FeatureFlagsKeysEnum.IS_MAX_STEPS_PER_WORKFLOW_ENABLED,
        environment: { _id: environment._id } as EnvironmentEntity,
      }),
    );

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

  async validateWorkflowLimit(environmentId: string) {
    const workflowsCount = await this.notificationTemplateRepository.count({
      _environmentId: environmentId,
    });

    if (workflowsCount < this.MAX_WORKFLOWS_LIMIT) {
      return;
    }

    const organization = await this.getOrganization(environmentId);
    const environment = await this.getEnvironment(environmentId);

    const maxWorkflowLimit = await this.getFeatureFlag.getNumber(
      GetFeatureFlagNumberCommand.create({
        key: FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER,
        defaultValue: this.MAX_WORKFLOWS_LIMIT,
        fallbackToDefault: -1,
        environment,
        organization,
      }),
    );

    if (workflowsCount >= maxWorkflowLimit) {
      throw new BadRequestException({
        message:
          'Workflow limit exceeded. Please contact us to support more workflows.',
        currentCount: workflowsCount,
        limit: maxWorkflowLimit,
      });
    }
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

  private async getOrganization(environmentId: string) {
    const organization = await this.organizationRepository.findOne({
      _environmentId: environmentId,
    });

    if (!organization) {
      throw new BadRequestException({
        message: 'Organization not found',
      });
    }

    return organization;
  }
}

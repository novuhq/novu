import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EnvironmentRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { GetFeatureFlag, NotificationStep } from '../usecases';

@Injectable()
export class ResourceValidatorService {
  private readonly MAX_STEPS_PER_WORKFLOW = 10;
  private readonly MAX_WORKFLOWS_LIMIT = 100;

  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    private getFeatureFlag: GetFeatureFlag,
  ) {}

  async validateStepsLimit(environmentId: string, steps: NotificationStep[]) {
    const isWorkflowLimitEnabled = await this.getFeatureFlag.execute({
      key: FeatureFlagsKeysEnum.IS_MAX_STEPS_PER_WORKFLOW_ENABLED,
      environmentId,
      organizationId: 'system',
      userId: 'system',
    });

    if (!isWorkflowLimitEnabled) {
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
    const environment = await this.getEnvironment(environmentId);

    const workflowsCount = await this.notificationTemplateRepository.count({
      _environmentId: environmentId,
    });

    if (workflowsCount < this.MAX_WORKFLOWS_LIMIT) {
      return;
    }

    const maxWorkflowLimit = await this.getFeatureFlag.getNumber({
      key: FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER,
      contextKey: 'environment',
      contextId: environmentId,
      defaultValue: this.MAX_WORKFLOWS_LIMIT,
      context: {
        createdAt: environment.createdAt,
      },
    });

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
}

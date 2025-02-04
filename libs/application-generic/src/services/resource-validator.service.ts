import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { GetFeatureFlag, NotificationStep } from '../usecases';
import { ApiException } from '../utils/exceptions';

@Injectable()
export class ResourceValidatorService {
  private readonly MAX_STEPS_PER_WORKFLOW = 10;
  private readonly MAX_WORKFLOWS_LIMIT_2024 = 1000;
  private readonly MAX_WORKFLOWS_LIMIT_2025 = 100;

  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getFeatureFlag: GetFeatureFlag,
  ) {}

  async validateStepsCount(environmentId: string, steps: NotificationStep[]) {
    const isWorkflowLimitEnabled = await this.getFeatureFlag.execute({
      key: FeatureFlagsKeysEnum.IS_MAX_WORKFLOW_LIMIT_ENABLED,
      environmentId,
      organizationId: 'system',
      userId: 'system',
    });

    if (!isWorkflowLimitEnabled) {
      return;
    }

    if (steps.length > this.MAX_STEPS_PER_WORKFLOW) {
      throw new ApiException({
        message: `Workflow steps limit exceeded. Maximum allowed steps is ${this.MAX_STEPS_PER_WORKFLOW}, but got ${steps.length} steps.`,
        providedStepsCount: steps.length,
        maxSteps: this.MAX_STEPS_PER_WORKFLOW,
      });
    }
  }

  async validateWorkflowLimit(environmentId: string) {
    const isWorkflowLimitEnabled = await this.getFeatureFlag.execute({
      key: FeatureFlagsKeysEnum.IS_MAX_WORKFLOW_LIMIT_ENABLED,
      environmentId,
      organizationId: 'system',
      userId: 'system',
    });

    if (!isWorkflowLimitEnabled) {
      return;
    }

    const enforcementTimestamp = new Date('2025-02-04T12:00:00.000Z');

    const [oldWorkflowsCount, newWorkflowsCount] = await Promise.all([
      this.notificationTemplateRepository.count({
        _environmentId: environmentId,
        createdAt: { $lt: enforcementTimestamp },
      }),
      this.notificationTemplateRepository.count({
        _environmentId: environmentId,
        createdAt: { $gte: enforcementTimestamp },
      }),
    ]);

    const totalWorkflowsCount = oldWorkflowsCount + newWorkflowsCount;
    if (totalWorkflowsCount >= this.MAX_WORKFLOWS_LIMIT_2024) {
      throw new ApiException({
        message: getErrorMessage(this.MAX_WORKFLOWS_LIMIT_2024),
        currentCount: totalWorkflowsCount,
        maxWorkflows: this.MAX_WORKFLOWS_LIMIT_2024,
      });
    }

    if (newWorkflowsCount >= this.MAX_WORKFLOWS_LIMIT_2025) {
      throw new ApiException({
        message: getErrorMessage(this.MAX_WORKFLOWS_LIMIT_2025),
        currentCount: newWorkflowsCount,
        maxWorkflows: this.MAX_WORKFLOWS_LIMIT_2025,
      });
    }
  }
}

function getErrorMessage(limit: number) {
  return `Workflow limit exceeded. Maximum allowed workflows is ${limit}. Please contact us to create more workflows.`;
}

import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { GetFeatureFlag, NotificationStep } from '../usecases';
import { ApiException } from '../utils/exceptions';

@Injectable()
export class ResourceValidatorService {
  private readonly MAX_STEPS_PER_WORKFLOW = 10;
  private readonly OLD_WORKFLOWS_LIMIT = 1000;
  private readonly NEW_WORKFLOWS_LIMIT = 100;

  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getFeatureFlag: GetFeatureFlag,
  ) {}

  async validateStepsCount(environmentId: string, steps: NotificationStep[]) {
    const isWorkflowLimitEnabled = await this.getFeatureFlag.execute({
      key: FeatureFlagsKeysEnum.IS_WORKFLOW_LIMIT_ENABLED,
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
      key: FeatureFlagsKeysEnum.IS_WORKFLOW_LIMIT_ENABLED,
      environmentId,
      organizationId: 'system',
      userId: 'system',
    });

    if (!isWorkflowLimitEnabled) {
      return;
    }

    const enforcementDate = await this.getFeatureFlag.date({
      key: FeatureFlagsKeysEnum.DATE_WORKFLOW_LIMIT_ENFORCEMENT,
      environmentId,
      organizationId: 'system',
      userId: 'system',
    });

    const enforcementTimestamp = new Date(enforcementDate).getTime();

    const [oldWorkflowsCount, newWorkflowsCount] = await Promise.all([
      this.notificationTemplateRepository.count({
        _environmentId: environmentId,
        createdAt: { $lt: new Date(enforcementTimestamp) },
      }),
      this.notificationTemplateRepository.count({
        _environmentId: environmentId,
        createdAt: { $gte: new Date(enforcementTimestamp) },
      }),
    ]);

    const totalWorkflowsCount = oldWorkflowsCount + newWorkflowsCount;
    if (totalWorkflowsCount >= this.OLD_WORKFLOWS_LIMIT) {
      throw new ApiException({
        message: getErrorMessage(this.OLD_WORKFLOWS_LIMIT),
        currentCount: totalWorkflowsCount,
        maxWorkflows: this.OLD_WORKFLOWS_LIMIT,
      });
    }

    if (newWorkflowsCount >= this.NEW_WORKFLOWS_LIMIT) {
      throw new ApiException({
        message: getErrorMessage(this.NEW_WORKFLOWS_LIMIT),
        currentCount: newWorkflowsCount,
        maxWorkflows: this.NEW_WORKFLOWS_LIMIT,
      });
    }
  }
}

function getErrorMessage(limit: number) {
  return `Workflow limit exceeded. Maximum allowed workflows is ${limit}. Please contact us to create more workflows.`;
}

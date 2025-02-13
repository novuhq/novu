import { BadRequestException, Injectable } from '@nestjs/common';
import {
  NotificationTemplateRepository,
  OrganizationRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { GetFeatureFlag, NotificationStep } from '../usecases';
import { LaunchDarklyService } from './launch-darkly.service';

@Injectable()
export class ResourceValidatorService {
  private readonly MAX_STEPS_PER_WORKFLOW = 10;
  private readonly MAX_WORKFLOWS_LIMIT = 100;

  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private organizationRepository: OrganizationRepository,
    private launchDarklyService: LaunchDarklyService,
  ) {}

  async validateStepsLimit(environmentId: string, steps: NotificationStep[]) {
    const isWorkflowLimitEnabled =
      await this.launchDarklyService.getWithFullContext({
        key: FeatureFlagsKeysEnum.IS_MAX_STEPS_PER_WORKFLOW_ENABLED,
        contextKey: 'environment',
        contextId: environmentId,
        defaultValue: false,
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
    const organization = await this.getOrganization(environmentId);

    const workflowsCount = await this.notificationTemplateRepository.count({
      _environmentId: environmentId,
    });

    if (workflowsCount < this.MAX_WORKFLOWS_LIMIT) {
      return;
    }

    const maxWorkflowLimit = await this.launchDarklyService.getWithFullContext({
      key: FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER,
      contextKey: 'environment',
      contextId: environmentId,
      defaultValue: this.MAX_WORKFLOWS_LIMIT,
      fallbackToDefault: -1,
      attributes: {
        organizationCreatedAt: organization.createdAt,
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

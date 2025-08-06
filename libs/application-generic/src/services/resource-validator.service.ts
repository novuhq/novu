import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CommunityOrganizationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  LayoutRepository,
  NotificationTemplateRepository,
  OrganizationEntity,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  getFeatureForTierAsNumber,
  ResourceOriginEnum,
  ResourceTypeEnum,
  UNLIMITED_VALUE,
} from '@novu/shared';
import { NotificationStep } from '../value-objects/notification.step';
import { FeatureFlagsService } from './feature-flags';

export const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEMO_WORKFLOWS_IDENTIFIER = [
  'demo-apartment-review',
  'a-new-member-joining-the-team',
  'demo-verify-otp',
  'demo-password-reset',
  'demo-recent-login',
  'demo-comment-on-task',
];

/* The absolute maximum values allowed by the system */
export const SYSTEM_LIMITS = {
  WORKFLOWS: 100,
  LAYOUTS: 100,
  STEPS_PER_WORKFLOW: 20,
  DEFER_DURATION_MS: 180 * DAY_IN_MS,
} as const;

/* The threshold below which validation is skipped */
export const MIN_VALIDATION_LIMITS = {
  WORKFLOWS: 20,
  LAYOUTS: 1,
  STEPS_PER_WORKFLOW: 20,
  DEFER_DURATION_MS: DAY_IN_MS,
} as const;

@Injectable()
export class ResourceValidatorService {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private organizationRepository: CommunityOrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private featureFlagService: FeatureFlagsService,
    private layoutRepository: LayoutRepository
  ) {}

  async validateStepsLimit(environmentId: string, organizationId: string, steps: NotificationStep[]): Promise<void> {
    if (steps.length < MIN_VALIDATION_LIMITS.STEPS_PER_WORKFLOW) {
      return;
    }

    const organization = await this.getOrganization(organizationId);

    const maxStepsPerWorkflowNumber = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_STEPS_PER_WORKFLOW_LIMIT_NUMBER,
      environment: { _id: environmentId },
      organization,
      defaultValue: SYSTEM_LIMITS.STEPS_PER_WORKFLOW,
    });

    if (steps.length > maxStepsPerWorkflowNumber) {
      throw new BadRequestException({
        message: `Workflow steps limit exceeded. Maximum allowed steps is ${maxStepsPerWorkflowNumber}, but got ${steps.length} steps.`,
        providedStepsCount: steps.length,
        maxSteps: maxStepsPerWorkflowNumber,
      });
    }
  }

  async validateWorkflowLimit(environmentId: string): Promise<void> {
    const workflowsCount = await this.notificationTemplateRepository.count({
      _environmentId: environmentId,
      'triggers.identifier': { $nin: DEMO_WORKFLOWS_IDENTIFIER },
    });

    if (workflowsCount < MIN_VALIDATION_LIMITS.WORKFLOWS) {
      return;
    }

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
    const systemLimitMaxWorkflow = await this.getMaxWorkflowSystemLimit(environment, organization);

    // If the system limit is not the default, we need to use it as the absolute limit for special cases instead of the tier limit
    const isSpecialLimit = systemLimitMaxWorkflow !== SYSTEM_LIMITS.WORKFLOWS;
    if (isSpecialLimit) {
      return systemLimitMaxWorkflow;
    }

    const maxWorkflowsTierLimit = await this.getMaxWorkflowsTierLimit(environment, organization);

    return Math.min(systemLimitMaxWorkflow, maxWorkflowsTierLimit);
  }

  private async getMaxWorkflowsTierLimit(environment, organization) {
    if (process.env.IS_SELF_HOSTED === 'true') {
      return UNLIMITED_VALUE; // Use existing constant for unlimited
    }

    return getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      organization.apiServiceLevel || ApiServiceLevelEnum.FREE,
      false
    );
  }

  private async getMaxWorkflowSystemLimit(environment, organization) {
    return await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER,
      defaultValue: SYSTEM_LIMITS.WORKFLOWS,
      environment,
      organization,
    });
  }

  async validateLayoutsLimit(environmentId: string, isV2Layout: boolean): Promise<void> {
    let layoutsCount = 0;
    if (isV2Layout) {
      layoutsCount = await this.layoutRepository.count({
        _environmentId: environmentId,
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
      });
    } else {
      layoutsCount = await this.layoutRepository.count({
        _environmentId: environmentId,
        type: { $exists: false },
        origin: { $exists: false },
      });
    }

    if (layoutsCount < MIN_VALIDATION_LIMITS.LAYOUTS) {
      return;
    }

    const environment = await this.getEnvironment(environmentId);
    const organization = await this.getOrganization(environment._organizationId);
    const maxLayoutsLimit = await this.getLayoutLimit(environment, organization, layoutsCount);

    if (layoutsCount >= maxLayoutsLimit) {
      throw new BadRequestException({
        message: 'Layout limit exceeded. Please contact us to support more layouts.',
        currentCount: layoutsCount,
        limit: maxLayoutsLimit,
      });
    }
  }

  private async getLayoutLimit(environment: EnvironmentEntity, organization: OrganizationEntity, layoutsCount: number) {
    const maxLayoutsTierLimit = await this.getMaxLayoutsTierLimit(organization);
    if (layoutsCount >= maxLayoutsTierLimit && organization.apiServiceLevel === ApiServiceLevelEnum.FREE) {
      return maxLayoutsTierLimit;
    }

    const systemLimitMaxLayouts = await this.getMaxLayoutsSystemLimit(environment, organization);
    // If the system limit is not the default, we need to use it as the absolute limit for special cases instead of the tier limit
    const isSpecialLimit = systemLimitMaxLayouts !== SYSTEM_LIMITS.LAYOUTS;
    if (isSpecialLimit) {
      return systemLimitMaxLayouts;
    }

    return Math.min(systemLimitMaxLayouts, maxLayoutsTierLimit);
  }

  private async getMaxLayoutsSystemLimit(environment, organization) {
    return await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_LAYOUT_LIMIT_NUMBER,
      defaultValue: SYSTEM_LIMITS.LAYOUTS,
      environment,
      organization,
    });
  }

  private async getMaxLayoutsTierLimit(organization) {
    if (process.env.IS_SELF_HOSTED === 'true') {
      return UNLIMITED_VALUE;
    }

    return getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_LAYOUTS,
      organization.apiServiceLevel || ApiServiceLevelEnum.FREE,
      false
    );
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

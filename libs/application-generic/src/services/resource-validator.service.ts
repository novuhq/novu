import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CommunityOrganizationRepository,
  DomainRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  EnvironmentVariableRepository,
  LayoutRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
  OrganizationEntity,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  FREE_TIER_LEGACY_MAX_WORKFLOWS,
  FREE_TIER_MAX_WORKFLOWS,
  getFeatureForTierAsNumber,
  ResourceOriginEnum,
  ResourceTypeEnum,
  UNLIMITED_VALUE,
} from '@novu/shared';
import { NotificationStep } from '../value-objects/notification.step';
import { FeatureFlagsService } from './feature-flags';
import { resolveTierLimit, throwPlanLimitExceeded } from './plan-limits';

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
  ENVIRONMENTS: 10,
  SUBSCRIBER_DEVICE_TOKENS: 100,
  ENVIRONMENT_VARIABLES: 10,
  STEP_RESOLVERS: 1000,
  DOMAINS: 10,
  AGENTS: 100,
  CUSTOM_EMAIL_DOMAINS: 50,
} as const;

/*
 * The threshold below which validation is skipped.
 * WORKFLOWS stays at the free-tier cap so creates below that count cannot skip it.
 */
export const MIN_VALIDATION_LIMITS = {
  WORKFLOWS: FREE_TIER_MAX_WORKFLOWS,
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
    private layoutRepository: LayoutRepository,
    private environmentVariableRepository: EnvironmentVariableRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private domainRepository: DomainRepository
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
    const tierLimitOverride = await this.getWorkflowTierLimitOverride(environment, organization);

    const { limit, limitSource } = await resolveTierLimit({
      featureFlagsService: this.featureFlagService,
      flagKey: FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER,
      systemDefault: SYSTEM_LIMITS.WORKFLOWS,
      featureName: FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      organizationId: organization._id,
      apiServiceLevel: organization.apiServiceLevel || ApiServiceLevelEnum.FREE,
      environment,
      organization,
      tierLimitOverride,
    });

    if (workflowsCount >= limit) {
      throwPlanLimitExceeded({
        resource: 'workflows',
        limitSource,
        limit,
        currentCount: workflowsCount,
      });
    }
  }

  /**
   * Returns a tier cap that replaces the one in the tier table, or undefined to use the table value.
   * Self-hosted is unlimited. Free-tier organizations fall back to the legacy cap while
   * `IS_FREE_TIER_WORKFLOW_LIMIT_ENABLED` is off.
   */
  private async getWorkflowTierLimitOverride(
    environment: EnvironmentEntity,
    organization: OrganizationEntity
  ): Promise<number | undefined> {
    if (process.env.IS_SELF_HOSTED === 'true') {
      return UNLIMITED_VALUE;
    }

    const tier = organization.apiServiceLevel || ApiServiceLevelEnum.FREE;
    if (tier !== ApiServiceLevelEnum.FREE) {
      return undefined;
    }

    const isFreeTierWorkflowLimitEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_FREE_TIER_WORKFLOW_LIMIT_ENABLED,
      defaultValue: true,
      environment,
      organization,
    });

    return isFreeTierWorkflowLimitEnabled ? undefined : FREE_TIER_LEGACY_MAX_WORKFLOWS;
  }

  async validateStepResolversLimit(
    environmentId: string,
    organizationId: string,
    newStepsCount: number
  ): Promise<void> {
    if (process.env.IS_SELF_HOSTED === 'true') {
      return;
    }

    if (newStepsCount === 0) {
      return;
    }

    const existingCount = await this.messageTemplateRepository.count({
      _environmentId: environmentId,
      stepResolverHash: { $exists: true, $nin: [null, ''] },
    });

    const environment = await this.getEnvironment(environmentId);
    const organization = await this.getOrganization(organizationId);
    const maxStepResolversLimit = await this.getStepResolversLimit(environment, organization);
    const totalAfterDeploy = existingCount + newStepsCount;

    if (totalAfterDeploy > maxStepResolversLimit) {
      throw new BadRequestException({
        message: `Code steps limit exceeded. Maximum allowed is ${maxStepResolversLimit}, but this deployment would reach ${totalAfterDeploy} code steps.`,
        currentCount: existingCount,
        newStepsCount,
        limit: maxStepResolversLimit,
      });
    }
  }

  async getStepResolversAvailableSlots(environmentId: string, organizationId: string): Promise<number> {
    if (process.env.IS_SELF_HOSTED === 'true') {
      return UNLIMITED_VALUE;
    }

    const existingCount = await this.messageTemplateRepository.count({
      _environmentId: environmentId,
      stepResolverHash: { $exists: true, $nin: [null, ''] },
    });
    const environment = await this.getEnvironment(environmentId);
    const organization = await this.getOrganization(organizationId);
    const limit = await this.getStepResolversLimit(environment, organization);

    if (limit >= UNLIMITED_VALUE) {
      return UNLIMITED_VALUE;
    }

    return Math.max(0, limit - existingCount);
  }

  private async getStepResolversLimit(environment: EnvironmentEntity, organization: OrganizationEntity) {
    const systemLimitMaxStepResolvers = await this.getMaxStepResolversSystemLimit(environment, organization);
    const isSpecialLimit = systemLimitMaxStepResolvers !== SYSTEM_LIMITS.STEP_RESOLVERS;

    if (isSpecialLimit) {
      return systemLimitMaxStepResolvers;
    }

    const maxStepResolversTierLimit = await this.getMaxStepResolversTierLimit(organization);

    return Math.min(systemLimitMaxStepResolvers, maxStepResolversTierLimit);
  }

  private async getMaxStepResolversSystemLimit(environment: EnvironmentEntity, organization: OrganizationEntity) {
    return await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_STEP_RESOLVERS_NUMBER,
      defaultValue: SYSTEM_LIMITS.STEP_RESOLVERS,
      environment,
      organization,
    });
  }

  private async getMaxStepResolversTierLimit(organization: OrganizationEntity) {
    if (process.env.IS_SELF_HOSTED === 'true') {
      return UNLIMITED_VALUE;
    }

    return getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_STEP_RESOLVERS,
      organization.apiServiceLevel || ApiServiceLevelEnum.FREE,
      false
    );
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

  async validateEnvironmentVariablesLimit(organizationId: string): Promise<void> {
    const variablesCount = await this.environmentVariableRepository.count({ _organizationId: organizationId });
    const maxEnvironmentVariablesLimit = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_ENVIRONMENT_VARIABLES_LIMIT_NUMBER,
      defaultValue: SYSTEM_LIMITS.ENVIRONMENT_VARIABLES,
      organization: { _id: organizationId },
    });

    if (variablesCount >= maxEnvironmentVariablesLimit) {
      throw new BadRequestException({
        message: `Environment variables limit exceeded. Maximum allowed variables is ${maxEnvironmentVariablesLimit}.`,
        currentCount: variablesCount,
        limit: maxEnvironmentVariablesLimit,
      });
    }
  }

  async validateDomainsLimit(organizationId: string): Promise<void> {
    const domainsCount = await this.domainRepository.count({
      _organizationId: organizationId,
    });
    const maxDomainsLimit = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_DOMAINS_LIMIT_NUMBER,
      defaultValue: SYSTEM_LIMITS.DOMAINS,
      organization: { _id: organizationId },
    });

    if (domainsCount >= maxDomainsLimit) {
      // System-side anti-abuse cap (raised per-org via LD by the Novu team) —
      // upgrading does not lift it, so the error points at support (409).
      throwPlanLimitExceeded({
        resource: 'domains',
        limitSource: 'system',
        limit: maxDomainsLimit,
        currentCount: domainsCount,
      });
    }
  }

  /**
   * Enforces the custom email domain count limit (Connect product). This
   * complements the route-level `@ProductFeature(CUSTOM_DOMAINS)` gate, which
   * already blocks Free/Pro entirely:
   *   - plan limits are lifted by upgrading (402);
   *   - system limits (Team/Enterprise are unlimited and bounded only by the
   *     platform cap, or a per-org LD override) cannot be lifted by upgrading —
   *     contact the Novu team (409).
   */
  async validateCustomEmailDomainsLimit(organizationId: string): Promise<void> {
    if (process.env.IS_SELF_HOSTED === 'true') {
      return;
    }

    const organization = await this.getOrganization(organizationId);
    const { limit, limitSource } = await resolveTierLimit({
      featureFlagsService: this.featureFlagService,
      flagKey: FeatureFlagsKeysEnum.MAX_CUSTOM_EMAIL_DOMAINS_NUMBER,
      systemDefault: SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS,
      featureName: FeatureNameEnum.AGENT_MAX_CUSTOM_EMAIL_DOMAINS,
      organizationId,
      apiServiceLevel: organization.apiServiceLevel || ApiServiceLevelEnum.FREE,
    });
    const currentCount = await this.domainRepository.count({ _organizationId: organizationId });

    if (currentCount < limit) {
      return;
    }

    throwPlanLimitExceeded({
      resource: 'custom email domains',
      limitSource,
      limit,
      currentCount,
      planMessage: `Your plan includes ${limit} custom email domain${
        limit === 1 ? '' : 's'
      }. Please upgrade your plan to add more.`,
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

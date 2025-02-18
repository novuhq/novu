import {
  ApiServiceLevelEnum,
  FeatureFlags,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
} from '@novu/shared';
import { OrganizationRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { ValidateTiersCommand } from './validate-tiers.command';
import { TierValidationTypeEnum } from './tier-validation-type.enum';
import { TierExceededException } from './tier-exceeded.exception';

@Injectable()
export class ValidateTiersUseCase {
  constructor(
    private organizationRepository: OrganizationRepository,
    private getFeatureFlag: FeatureFlagsService
  ) {}
  async execute(validateTiersCommand: ValidateTiersCommand): Promise<void> {
    const organization = await this.organizationRepository.findById(validateTiersCommand.organizationId);
    const featureFlags = await this.getFeatureFlags();
    if (!organization) {
      throw new Error(`Organization not found ${JSON.stringify(organization)}`);
    }
    const apiServiceLevel = organization.apiServiceLevel || ApiServiceLevelEnum.FREE;
    if (validateTiersCommand.validationType === TierValidationTypeEnum.WORKFLOW_COUNT) {
      this.validateWorkflowCount(validateTiersCommand, apiServiceLevel, featureFlags);
    }
  }
  private async getFeatureFlags(): Promise<Partial<FeatureFlags>> {
    const featureFlags: Partial<FeatureFlags> = {};

    const featureFlagKeys = [FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED];

    for (const flagKey of featureFlagKeys) {
      const { key, value } = await this.getFeatureFlagStatus(flagKey);
      featureFlags[key] = value;
    }

    return featureFlags;
  }
  private async getFeatureFlagStatus(
    key: FeatureFlagsKeysEnum
  ): Promise<{ key: FeatureFlagsKeysEnum; value: boolean }> {
    const status = await this.getFeatureFlag.getFlag({
      defaultValue: false,
      key,
    });

    return { key, value: this.isStatusPositive(status) };
  }
  private isStatusPositive(status: boolean | number): boolean {
    if (typeof status === 'boolean') {
      return status;
    }

    return status > 0;
  }
  private validateWorkflowCount(
    validateTiersCommand: ValidateTiersCommand,
    apiServiceLevel: ApiServiceLevelEnum,
    featureFlags: Partial<FeatureFlags>
  ) {
    const numberOfWorkflows = validateTiersCommand.valueToValidate;
    const maxWorkflows = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      apiServiceLevel,
      featureFlags,
      false
    );
    if (maxWorkflows === -1) {
      return;
    }
    if (numberOfWorkflows >= maxWorkflows) {
      throw new TierExceededException(
        TierValidationTypeEnum.WORKFLOW_COUNT,
        `You have exceeded the maximum number of workflows allowed for the [${apiServiceLevel}] tier`
      );
    }
  }
}

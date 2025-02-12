import {
  ApiServiceLevelEnum,
  FeatureFlags,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  getFeatureForTierAsNumber,
} from '@novu/shared';
import { OrganizationRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';
import { GetFeatureFlag, GetFeatureFlagCommand, TierRestrictionsValidateCommand } from '@novu/application-generic';
import { ValidateTiersCommand } from './validate-tiers.command';
import { TierValidationTypeEnum } from './tier-validation-type.enum';

@Injectable()
export class ValidateTiersUseCase {
  constructor(
    private organizationRepository: OrganizationRepository,
    private getFeatureFlag: GetFeatureFlag
  ) {}
  async execute(validateTiersCommand: ValidateTiersCommand): Promise<void> {
    const organization = await this.organizationRepository.findById(validateTiersCommand.organizationId);
    const featureFlags = await this.getFeatureFlags(validateTiersCommand);
    if (!organization || !organization.apiServiceLevel) {
      throw new Error(`Organization not found ${JSON.stringify(organization)}`);
    }
    if (validateTiersCommand.validationType === TierValidationTypeEnum.ENVIRONMENT_COUNT) {
      this.validateEnvironmentCount(organization.apiServiceLevel, featureFlags);
    }
    if (validateTiersCommand.validationType === TierValidationTypeEnum.WORKFLOW_COUNT) {
      this.validateWorkflowCount(validateTiersCommand, organization.apiServiceLevel, featureFlags);
    }
  }
  private async getFeatureFlags(command: TierRestrictionsValidateCommand): Promise<Partial<FeatureFlags>> {
    const featureFlags: Partial<FeatureFlags> = {};

    const featureFlagKeys = [FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED];

    for (const flagKey of featureFlagKeys) {
      const { key, value } = await this.getFeatureFlagStatus(command, flagKey);
      featureFlags[key] = value;
    }

    return featureFlags;
  }
  private async getFeatureFlagStatus(
    command: TierRestrictionsValidateCommand,
    key: FeatureFlagsKeysEnum
  ): Promise<{ key: FeatureFlagsKeysEnum; value: boolean }> {
    const status = await this.getFeatureFlag.execute(
      GetFeatureFlagCommand.create({
        userId: 'system',
        environmentId: 'system',
        organizationId: command.organizationId,
        key,
      })
    );

    return { key, value: status };
  }

  private validateEnvironmentCount(apiServiceLevel: ApiServiceLevelEnum, featureFlags: Partial<FeatureFlags>) {
    const allowedToAdd = getFeatureForTierAsBoolean(
      FeatureNameEnum.CUSTOM_ENVIRONMENTS_BOOLEAN,
      apiServiceLevel,
      featureFlags
    );
    if (!allowedToAdd) {
      throw new Error(`You have exceeded the maximum number of environments allowed for the [${apiServiceLevel}] tier`);
    }
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
      throw new Error(`You have exceeded the maximum number of workflows allowed for the [${apiServiceLevel}] tier`);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { parseExpression as parseCronExpression } from 'cron-parser';
import { addYears, differenceInMilliseconds, isAfter } from 'date-fns';

import {
  ApiServiceLevelEnum,
  DigestUnitEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  StepTypeEnum,
} from '@novu/shared';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';

import { TierRestrictionsValidateCommand } from './tier-restrictions-validate.command';
import {
  ErrorEnum,
  TierRestrictionsValidateResponse,
  TierValidationError,
} from './tier-restrictions-validate.response';
import { InstrumentUsecase } from '../../instrumentation';
import { FeatureFlagsService } from '../../services';

export const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
export const FREE_TIER_MAX_DELAY_DAYS = 30;
export const BUSINESS_TIER_MAX_DELAY_DAYS = 90;

@Injectable()
export class TierRestrictionsValidateUsecase {
  constructor(
    private organizationRepository: CommunityOrganizationRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: TierRestrictionsValidateCommand): Promise<TierRestrictionsValidateResponse> {
    if (![StepTypeEnum.DIGEST, StepTypeEnum.DELAY].includes(command.stepType)) {
      return [];
    }

    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) {
      throw new Error(`Organization not found: ${command.organizationId}`);
    }

    const isTierDurationRestrictionExcluded = await this.isOrganizationExcludedFromRestriction(command, organization);

    if (isTierDurationRestrictionExcluded) {
      return [];
    }

    const maxDelayMs = await this.getMaxDelayInMs(command, organization);

    if (isCronExpression(command.cron)) {
      if (this.isCronDeltaDeferDurationExceededTier(command.cron, maxDelayMs)) {
        return [
          {
            controlKey: 'cron',
            error: ErrorEnum.TIER_LIMIT_EXCEEDED,
            message:
              `The maximum delay allowed is ${msToDays(maxDelayMs)} days. ` +
              'Please contact our support team to discuss extending this limit for your use case.',
          },
        ];
      }

      return [];
    }

    if (isRegularDeferAction(command)) {
      const deferDurationMs = calculateDeferDuration(command);

      const amountIssue = buildIssue(deferDurationMs, maxDelayMs, ErrorEnum.TIER_LIMIT_EXCEEDED, 'amount');
      const unitIssue = buildIssue(deferDurationMs, maxDelayMs, ErrorEnum.TIER_LIMIT_EXCEEDED, 'unit');

      return [amountIssue, unitIssue].filter(Boolean);
    }

    return [];
  }

  private async getMaxDelayInMs(command: TierRestrictionsValidateCommand, organization: OrganizationEntity) {
    const isPackagesQ1Enabled = await this.is4PackageTierActivated(command, organization);
    const featureFlags = { [FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED]: isPackagesQ1Enabled };

    return getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_DIGEST_WINDOW_TIME,
      organization.apiServiceLevel || ApiServiceLevelEnum.FREE,
      featureFlags,
      true
    );
  }

  private async isOrganizationExcludedFromRestriction(
    command: TierRestrictionsValidateCommand,
    organization: OrganizationEntity
  ) {
    return await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_TIER_DURATION_RESTRICTION_EXCLUDED_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization,
    });
  }

  private async is4PackageTierActivated(command: TierRestrictionsValidateCommand, organization: OrganizationEntity) {
    return await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization,
    });
  }

  private isCronDeltaDeferDurationExceededTier(cron: string, maxDelayMs: number): boolean {
    const cronExpression = parseCronExpression(cron);
    const firstDate = cronExpression.next().toDate();
    const twoYearsFromFirst = addYears(firstDate, 2);
    let previousDate = firstDate;
    const MAX_ITERATIONS = 50;

    for (let i = 0; i < MAX_ITERATIONS; i += 1) {
      const currentDate = cronExpression.next().toDate();

      // If we've gone past two years from the first date, the intervals are safe
      if (isAfter(currentDate, twoYearsFromFirst)) {
        return false;
      }

      const deferDurationMs = differenceInMilliseconds(currentDate, previousDate);

      if (deferDurationMs > maxDelayMs) {
        return true;
      }

      previousDate = currentDate;
    }

    return false;
  }
}

function calculateDeferDuration(command: TierRestrictionsValidateCommand): number | null {
  if (command.deferDurationMs) {
    return command.deferDurationMs;
  }

  if (isValidDigestUnit(command.unit) && isNumber(command.amount)) {
    return calculateMilliseconds(command.amount, command.unit);
  }

  return null;
}

function isValidDigestUnit(unit: unknown): unit is DigestUnitEnum {
  return Object.values(DigestUnitEnum).includes(unit as DigestUnitEnum);
}

function isNumber(value: unknown): value is number {
  return !Number.isNaN(Number(value));
}

function calculateMilliseconds(amount: number, unit: DigestUnitEnum): number {
  switch (unit) {
    case DigestUnitEnum.SECONDS:
      return amount * 1000;
    case DigestUnitEnum.MINUTES:
      return amount * 1000 * 60;
    case DigestUnitEnum.HOURS:
      return amount * 1000 * 60 * 60;
    case DigestUnitEnum.DAYS:
      return amount * 1000 * 60 * 60 * 24;
    case DigestUnitEnum.WEEKS:
      return amount * 1000 * 60 * 60 * 24 * 7;
    case DigestUnitEnum.MONTHS:
      return amount * 1000 * 60 * 60 * 24 * 30; // Using 30 days as an approximation for a month
    default:
      return 0;
  }
}

/*
 * Cron expression is another term for a timed digest
 */
const isCronExpression = (cron: string) => {
  return !!cron;
};

const isRegularDeferAction = (command: TierRestrictionsValidateCommand) => {
  if (command.deferDurationMs) {
    return true;
  }

  return !!command.amount && isNumber(command.amount) && !!command.unit && isValidDigestUnit(command.unit);
};

function buildIssue(
  deferDurationMs: number,
  maxDelayMs: number,
  error: ErrorEnum,
  controlKey: string
): TierValidationError | null {
  if (deferDurationMs > maxDelayMs) {
    return {
      controlKey,
      error,
      message:
        `The maximum delay allowed is ${msToDays(maxDelayMs)} days. ` +
        'Please contact our support team to discuss extending this limit for your use case.',
    };
  }

  return null;
}

function msToDays(ms: number): number {
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

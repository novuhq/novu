import { Injectable } from '@nestjs/common';
import { parseExpression as parseCronExpression } from 'cron-parser';

import {
  DigestUnitEnum,
  FeatureFlags,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  StepTypeEnum,
} from '@novu/shared';

import { addYears, differenceInMilliseconds, isAfter } from 'date-fns';
import { CommunityOrganizationRepository } from '@novu/dal';
import { GetFeatureFlag, GetFeatureFlagCommand } from '../get-feature-flag';

import { TierRestrictionsValidateCommand } from './tier-restrictions-validate.command';
import {
  ErrorEnum,
  TierRestrictionsValidateResponse,
  TierValidationError,
} from './tier-restrictions-validate.response';
import { InstrumentUsecase } from '../../instrumentation';

export const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ValidateContentTierLimits {
  constructor(
    private getFeatureFlag: GetFeatureFlag,
    private organizationRepository: CommunityOrganizationRepository,
  ) {}

  @InstrumentUsecase()
  async execute(
    command: TierRestrictionsValidateCommand,
  ): Promise<TierRestrictionsValidateResponse> {
    if (![StepTypeEnum.DIGEST, StepTypeEnum.DELAY].includes(command.stepType)) {
      return [];
    }

    const featureFlags = await this.getFeatureFlags(command);
    if (
      featureFlags[
        FeatureFlagsKeysEnum.IS_TIER_DURATION_RESTRICTION_EXCLUDED_ENABLED
      ]
    ) {
      return [];
    }

    const apiServiceLevel = (
      await this.organizationRepository.findById(command.organizationId)
    )?.apiServiceLevel;
    const maxDelayMs = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_DIGEST_WINDOW_TIME,
      apiServiceLevel,
      featureFlags,
      true,
    );

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

      const amountIssue = buildIssue(
        deferDurationMs,
        maxDelayMs,
        ErrorEnum.TIER_LIMIT_EXCEEDED,
        'amount',
      );
      const unitIssue = buildIssue(
        deferDurationMs,
        maxDelayMs,
        ErrorEnum.TIER_LIMIT_EXCEEDED,
        'unit',
      );

      return [amountIssue, unitIssue].filter(Boolean);
    }

    return [];
  }

  private async getFeatureFlags(
    command: TierRestrictionsValidateCommand,
  ): Promise<Partial<FeatureFlags>> {
    const featureFlags: Partial<FeatureFlags> = {};

    const featureFlagKeys = [
      FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED,
      FeatureFlagsKeysEnum.IS_TIER_DURATION_RESTRICTION_EXCLUDED_ENABLED,
    ];

    for (const flagKey of featureFlagKeys) {
      const { key, value } = await this.getFeatureFlagStatus(command, flagKey);
      featureFlags[key] = value;
    }

    return featureFlags;
  }

  private async getFeatureFlagStatus(
    command: TierRestrictionsValidateCommand,
    key: FeatureFlagsKeysEnum,
  ): Promise<{ key: FeatureFlagsKeysEnum; value: boolean }> {
    const status = await this.getFeatureFlag.execute(
      GetFeatureFlagCommand.create({
        userId: 'system',
        environmentId: 'system',
        organizationId: command.organizationId,
        key,
      }),
    );

    return { key, value: status };
  }

  private isCronDeltaDeferDurationExceededTier(
    cron: string,
    maxDelayMs: number,
  ): boolean {
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
      // negative value means there is no maxDelay
      if (maxDelayMs < 0) {
        return false;
      }
      const deferDurationMs = differenceInMilliseconds(
        currentDate,
        previousDate,
      );

      if (deferDurationMs > maxDelayMs) {
        return true;
      }

      previousDate = currentDate;
    }

    return false;
  }
}

function calculateDeferDuration(
  command: TierRestrictionsValidateCommand,
): number | null {
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

  return (
    !!command.amount &&
    isNumber(command.amount) &&
    !!command.unit &&
    isValidDigestUnit(command.unit)
  );
};

function buildIssue(
  deferDurationMs: number,
  maxDelayMs: number,
  error: ErrorEnum,
  controlKey: string,
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

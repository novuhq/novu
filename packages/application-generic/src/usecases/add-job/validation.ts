import {
  DigestTypeEnum,
  DigestUnitEnum,
  IDigestRegularMetadata,
  IAmountAndUnit,
  StepTypeEnum,
  DaysEnum,
  MonthlyTypeEnum,
  ITimedConfig,
  OrdinalEnum,
  OrdinalValueEnum,
} from '@novu/shared';
import { JobEntity } from '@novu/dal';

import { ApiException } from '../../utils/exceptions';
import { isRegularDigest } from '../../utils/digest';

const validateAmountAndUnit = (digest: IAmountAndUnit) => {
  if (!digest?.amount) {
    throw new ApiException('Invalid digest amount');
  }

  if (!digest?.unit) {
    throw new ApiException('Invalid digest unit');
  }
};

const hasValidAtTime = (atTime: string) => {
  const atTimeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

  return atTimeRegex.test(atTime);
};

const validateAtTime = (atTime?: string) => {
  if (!atTime) {
    throw new ApiException('Digest timed config atTime is missing');
  }

  if (!hasValidAtTime(atTime)) {
    throw new ApiException(
      'Digest timed config atTime has invalid format, expected 24h time format'
    );
  }
};

const validateWeekDays = (weekDays?: DaysEnum[]) => {
  if (!weekDays) {
    throw new ApiException('Digest timed config weekDays is missing');
  }

  const allowedValues = Object.values(DaysEnum);
  const allValid = weekDays.every((day) => allowedValues.includes(day));
  if (!allValid) {
    throw new ApiException('Digest timed config weekDays has invalid values');
  }
};

const validMonthDayRange = (monthDay: number) => monthDay < 1 || monthDay > 31;

const validateMonthDays = (monthDays?: number[]) => {
  if (!monthDays) {
    throw new ApiException('Digest timed config monthDays is missing');
  }

  const allValid = monthDays.every((day) => validMonthDayRange(day));
  if (!allValid) {
    throw new ApiException('Digest timed config monthDays values are invalid');
  }
};

const validateOrdinal = (timed: ITimedConfig) => {
  if (!timed.ordinal || !timed.ordinalValue) {
    throw new ApiException('Digest timed config ordinal is missing');
  }

  if (!Object.values(OrdinalEnum).includes(timed.ordinal)) {
    throw new ApiException('Digest timed config for ordinal is invalid');
  }

  if (!Object.values(OrdinalValueEnum).includes(timed.ordinalValue)) {
    throw new ApiException('Digest timed config for ordinal value is invalid');
  }
};

export const validateDigest = (job: JobEntity): void => {
  if (job.type !== StepTypeEnum.DIGEST) {
    throw new ApiException('Job is not a digest type');
  }

  if (isRegularDigest(job.digest.type)) {
    validateAmountAndUnit(job.digest as IDigestRegularMetadata);
  }

  if (job.digest.type === DigestTypeEnum.TIMED) {
    validateAmountAndUnit(job.digest);

    switch (job.digest.unit) {
      case DigestUnitEnum.DAYS:
      case DigestUnitEnum.WEEKS:
      case DigestUnitEnum.MONTHS: {
        if (!job.digest.timed) {
          throw new ApiException('Digest timed config is missing');
        }
        validateAtTime(job.digest.timed.atTime);

        if (job.digest.unit === DigestUnitEnum.WEEKS) {
          validateWeekDays(job.digest.timed.weekDays);
        }

        if (
          job.digest.unit === DigestUnitEnum.MONTHS &&
          job.digest.timed.monthlyType === MonthlyTypeEnum.EACH
        ) {
          validateMonthDays(job.digest.timed.monthDays);
        }

        if (
          job.digest.unit === DigestUnitEnum.MONTHS &&
          job.digest.timed.monthlyType === MonthlyTypeEnum.ON
        ) {
          validateOrdinal(job.digest.timed);
        }
      }
    }
  }
};

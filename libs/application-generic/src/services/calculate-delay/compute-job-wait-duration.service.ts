import { BadRequestException, Logger } from '@nestjs/common';
import {
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  IDelayDynamicMetadata,
  IDelayRegularMetadata,
  IDelayScheduledMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IWorkflowStepMetadata,
} from '@novu/shared';
import { differenceInMilliseconds } from 'date-fns';
import { getNestedValue } from '../../utils';
import { isRegularDigest } from '../../utils/digest';
import { DurationUtils } from '../../utils/duration-utils';
import { TimedDigestDelayService } from './timed-digest-delay.service';

export class ComputeJobWaitDurationService {
  calculateDelay({
    stepMetadata,
    payload,
    overrides,
    timezone,
  }: {
    stepMetadata?: IWorkflowStepMetadata;
    payload: any;
    overrides: any;
    timezone?: string;
  }): number {
    if (!stepMetadata) {
      throw new BadRequestException(`Step metadata not found`);
    }

    const digestType = 'type' in stepMetadata ? stepMetadata.type : null;

    if (digestType === DelayTypeEnum.SCHEDULED) {
      const { delayPath } = stepMetadata as IDelayScheduledMetadata;
      if (!delayPath) throw new BadRequestException(`Delay path not found`);

      const delayDate = payload[delayPath];
      const delay = differenceInMilliseconds(new Date(delayDate), new Date());

      if (delay < 0) {
        throw new BadRequestException({
          message: `Delay date at path must be a future date`,
          delayPath,
        });
      }

      return delay;
    } else if (digestType === DelayTypeEnum.DYNAMIC) {
      const { dynamicKey } = stepMetadata as IDelayDynamicMetadata;
      if (!dynamicKey) throw new BadRequestException(`Dynamic delay key not found`);

      const value = getNestedValue({ payload }, dynamicKey);

      if (!value) {
        throw new BadRequestException(`Dynamic delay key '${dynamicKey}' not found in payload`);
      }

      if (typeof value === 'string' && DurationUtils.isISO8601(value)) {
        const targetTime = new Date(value).getTime();
        const now = Date.now();
        const delay = targetTime - now;

        if (delay < 0) {
          throw new BadRequestException(`Dynamic delay timestamp '${value}' must be a future date`);
        }

        return delay;
      }

      if (typeof value === 'object' && value !== null && 'unit' in value && 'amount' in value) {
        const durationObj = value as { unit: string; amount: number };

        if (typeof durationObj.amount !== 'number' || durationObj.amount < 0) {
          throw new BadRequestException(`Invalid amount '${durationObj.amount}' in dynamic delay`);
        }

        try {
          return DurationUtils.convertToMilliseconds(durationObj.amount, durationObj.unit);
        } catch {
          throw new BadRequestException(`Invalid time unit '${durationObj.unit}' in dynamic delay`);
        }
      }

      throw new BadRequestException(
        `Dynamic delay value '${JSON.stringify(value)}' is not a valid format. Expected ISO-8601 timestamp or duration object { amount: number, unit: string }`
      );
    } else if (
      digestType &&
      (digestType === DigestTypeEnum.REGULAR ||
        digestType === DigestTypeEnum.BACKOFF ||
        digestType === DelayTypeEnum.REGULAR) &&
      isRegularDigest(digestType)
    ) {
      if (this.isValidDelayOverride(overrides)) {
        return this.toMilliseconds(overrides.delay.amount as number, overrides.delay.unit as DigestUnitEnum);
      }

      const regularDigestMeta = stepMetadata as IDigestRegularMetadata;

      return this.toMilliseconds(regularDigestMeta.amount, regularDigestMeta.unit);
    } else if (digestType === DigestTypeEnum.TIMED) {
      const timedDigestMeta = stepMetadata as IDigestTimedMetadata;

      return TimedDigestDelayService.calculate({
        unit: timedDigestMeta.unit,
        amount: timedDigestMeta.amount,
        timeConfig: {
          ...timedDigestMeta.timed,
        },
        timezone,
      });
    } else if ((stepMetadata as IDelayRegularMetadata)?.unit && (stepMetadata as IDelayRegularMetadata)?.amount) {
      if (this.isValidDelayOverride(overrides)) {
        return this.toMilliseconds(overrides.delay.amount as number, overrides.delay.unit as DigestUnitEnum);
      }

      const regularDigestMeta = stepMetadata as IDelayRegularMetadata;

      return this.toMilliseconds(regularDigestMeta.amount, regularDigestMeta.unit);
    }

    return 0;
  }

  private toMilliseconds(amount: number, unit: DigestUnitEnum): number {
    Logger.debug(`Amount is: ${amount}`);
    Logger.debug(`Unit is: ${unit}`);
    Logger.verbose('Converting to milliseconds');

    let delay = 1000 * amount;
    if (unit === DigestUnitEnum.MONTHS) {
      delay *= 60 * 60 * 24 * 30;
    }
    if (unit === DigestUnitEnum.WEEKS) {
      delay *= 60 * 60 * 24 * 7;
    }
    if (unit === DigestUnitEnum.DAYS) {
      delay *= 60 * 60 * 24;
    }
    if (unit === DigestUnitEnum.HOURS) {
      delay *= 60 * 60;
    }
    if (unit === DigestUnitEnum.MINUTES) {
      delay *= 60;
    }

    Logger.verbose(`Amount of delay is: ${delay}ms.`);

    return delay;
  }

  private isValidDelayOverride(overrides: any): boolean {
    if (!overrides?.delay) {
      return false;
    }

    const isDelayAmountANumber = typeof overrides.delay.amount === 'number';
    const digestUnits = Object.values(DigestUnitEnum);
    const includesValidDelayUnit = digestUnits.includes(overrides.delay.unit as unknown as DigestUnitEnum);

    return isDelayAmountANumber && includesValidDelayUnit;
  }
}

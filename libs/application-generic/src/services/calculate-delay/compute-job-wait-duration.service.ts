import { BadRequestException, Logger } from '@nestjs/common';
import {
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  IDelayRegularMetadata,
  IDelayScheduledMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IWorkflowStepMetadata,
} from '@novu/shared';
import { differenceInMilliseconds } from 'date-fns';

import { isRegularDigest } from '../../utils/digest';
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

    const digestType = stepMetadata.type;

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
    } else if (isRegularDigest(digestType)) {
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

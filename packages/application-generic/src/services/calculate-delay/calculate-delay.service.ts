import { Logger } from '@nestjs/common';
import { differenceInMilliseconds } from 'date-fns';
import {
  DigestUnitEnum,
  DelayTypeEnum,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IWorkflowStepMetadata,
  DigestTypeEnum,
  IDelayScheduledMetadata,
} from '@novu/shared';

import { ApiException } from '../../utils/exceptions';
import { isRegularDigest } from '../../utils/digest';
import { TimedDigestDelayService } from './timed-digest-delay.service';
import {
  IChimeraDelayResponse,
  IChimeraDigestResponse,
} from '../../utils/require-inject';

export class CalculateDelayService {
  calculateDelay({
    stepMetadata,
    payload,
    overrides,
    chimeraResponse,
  }: {
    stepMetadata?: IWorkflowStepMetadata;
    payload: any;
    overrides: any;
    chimeraResponse?: IChimeraDigestResponse | IChimeraDelayResponse;
  }): number {
    const digestType =
      (chimeraResponse?.type as DigestTypeEnum) ?? stepMetadata.type;
    if (!stepMetadata) throw new ApiException(`Step metadata not found`);

    if (digestType === DelayTypeEnum.SCHEDULED) {
      const delayPath = (stepMetadata as IDelayScheduledMetadata).delayPath;
      if (!delayPath) throw new ApiException(`Delay path not found`);

      const delayDate = payload[delayPath];

      const delay = differenceInMilliseconds(new Date(delayDate), new Date());

      if (delay < 0) {
        throw new ApiException(
          `Delay date at path ${delayPath} must be a future date`
        );
      }

      return delay;
    }

    const chimeraUnit = castToDigestUnitEnum(chimeraResponse?.unit);

    if (isRegularDigest(digestType)) {
      if (this.checkValidDelayOverride(overrides)) {
        return this.toMilliseconds(
          chimeraResponse?.amount ?? (overrides.delay.amount as number),
          chimeraUnit ?? (overrides.delay.unit as DigestUnitEnum)
        );
      }

      const regularDigestMeta = stepMetadata as IDigestRegularMetadata;

      return this.toMilliseconds(
        chimeraResponse?.amount ?? regularDigestMeta.amount,
        chimeraUnit ?? regularDigestMeta.unit
      );
    }

    if (digestType === DigestTypeEnum.TIMED) {
      const timedDigestMeta = stepMetadata as IDigestTimedMetadata;

      return TimedDigestDelayService.calculate({
        unit: timedDigestMeta.unit,
        amount: timedDigestMeta.amount,
        timeConfig: {
          ...timedDigestMeta.timed,
        },
      });
    }

    return 0;
  }

  private toMilliseconds(amount: number, unit: DigestUnitEnum): number {
    Logger.debug('Amount is: ' + amount);
    Logger.debug('Unit is: ' + unit);
    Logger.verbose('Converting to milliseconds');

    let delay = 1000 * amount;
    if (unit === DigestUnitEnum.DAYS) {
      delay = 60 * 60 * 24 * delay;
    }
    if (unit === DigestUnitEnum.HOURS) {
      delay = 60 * 60 * delay;
    }
    if (unit === DigestUnitEnum.MINUTES) {
      delay = 60 * delay;
    }

    Logger.verbose('Amount of delay is: ' + delay + 'ms.');

    return delay;
  }

  private checkValidDelayOverride(overrides: any): boolean {
    if (!overrides?.delay) {
      return false;
    }
    const values = Object.values(DigestUnitEnum);

    return (
      typeof overrides.delay.amount === 'number' &&
      values.includes(overrides.delay.unit as unknown as DigestUnitEnum)
    );
  }
}

function castToDigestUnitEnum(unit: string): DigestUnitEnum | undefined {
  switch (unit) {
    case 'seconds':
      return DigestUnitEnum.SECONDS;
    case 'minutes':
      return DigestUnitEnum.MINUTES;
    case 'hours':
      return DigestUnitEnum.HOURS;
    case 'days':
      return DigestUnitEnum.DAYS;
    case 'weeks':
      return DigestUnitEnum.WEEKS;
    case 'months':
      return DigestUnitEnum.MONTHS;
    default:
      return undefined;
  }
}

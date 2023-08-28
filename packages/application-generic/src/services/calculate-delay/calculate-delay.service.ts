import { Logger } from '@nestjs/common';
import { differenceInMilliseconds } from 'date-fns';
import {
  DigestUnitEnum,
  DelayTypeEnum,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IWorkflowStepMetadata,
  DigestTypeEnum,
} from '@novu/shared';

import { ApiException } from '../../utils/exceptions';
import { isRegularDigest } from '../../utils/digest';
import { TimedDigestDelayService } from './timed-digest-delay.service';

export class CalculateDelayService {
  calculateDelay({
    stepMetadata,
    payload,
    overrides,
  }: {
    stepMetadata?: IWorkflowStepMetadata;
    payload: any;
    overrides: any;
  }): number {
    if (!stepMetadata) throw new ApiException(`Step metadata not found`);

    if (stepMetadata.type === DelayTypeEnum.SCHEDULED) {
      const delayPath = stepMetadata.delayPath;
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

    if (isRegularDigest(stepMetadata.type)) {
      if (this.checkValidDelayOverride(overrides)) {
        return this.toMilliseconds(
          overrides.delay.amount as number,
          overrides.delay.unit as DigestUnitEnum
        );
      }

      const regularDigestMeta = stepMetadata as IDigestRegularMetadata;

      return this.toMilliseconds(
        regularDigestMeta.amount,
        regularDigestMeta.unit
      );
    }

    if (stepMetadata.type === DigestTypeEnum.TIMED) {
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

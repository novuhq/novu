import { DigestUnitEnum, DelayTypeEnum } from '@novu/shared';

import { Logger } from '@nestjs/common';
import { ApiException } from '../../utils/exceptions';
import { differenceInMilliseconds } from 'date-fns';
import { NotificationStepEntity } from '@novu/dal';

export class CalculateDelayService {
  calculateDelay(
    step: NotificationStepEntity,
    payload: any,
    overrides: any
  ): number {
    if (!step.metadata) throw new ApiException(`Step metadata not found`);

    if (step.metadata.type === DelayTypeEnum.SCHEDULED) {
      const delayPath = step.metadata.delayPath;
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

    if (this.checkValidDelayOverride(overrides)) {
      return this.toMilliseconds(
        overrides.delay.amount as number,
        overrides.delay.unit as DigestUnitEnum
      );
    }

    return this.toMilliseconds(
      step.metadata.amount as number,
      step.metadata.unit as DigestUnitEnum
    );
  }

  toMilliseconds(amount: number, unit: DigestUnitEnum): number {
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

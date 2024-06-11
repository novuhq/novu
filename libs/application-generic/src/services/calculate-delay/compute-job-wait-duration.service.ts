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
  IChimeraDigestResponse,
  IDelayOutput,
  IRegularDelay,
  IScheduledDelay,
} from '../../utils/require-inject';

export class ComputeJobWaitDurationService {
  calculateDelay({
    stepMetadata,
    payload,
    overrides,
    chimeraResponse,
  }: {
    stepMetadata?: IWorkflowStepMetadata;
    payload: any;
    overrides: any;
    chimeraResponse?: IChimeraDigestResponse | IDelayOutput;
  }): number {
    if (!stepMetadata) throw new ApiException(`Step metadata not found`);

    const digestType =
      (chimeraResponse?.type as DigestTypeEnum | DelayTypeEnum) ??
      stepMetadata.type;

    if (digestType === DelayTypeEnum.SCHEDULED) {
      const userMetadata = this.getUserScheduledDelayMetadata(chimeraResponse);
      let delay = 0;

      if (userMetadata?.date) {
        const delayDate = userMetadata.date;
        delay = differenceInMilliseconds(new Date(delayDate), new Date());

        if (delay < 0) {
          throw new ApiException(`Delay date at must be a future date`);
        }
      } else {
        const delayPath = (stepMetadata as IDelayScheduledMetadata).delayPath;

        if (!delayPath) throw new ApiException(`Delay path not found`);
        const delayDate = payload[delayPath];
        delay = differenceInMilliseconds(new Date(delayDate), new Date());

        if (delay < 0) {
          throw new ApiException(
            `Delay date at path ${delayPath} must be a future date`
          );
        }
      }

      return delay;
    } else if (isRegularDigest(digestType)) {
      const userMetadata = this.getUserRegularDelayMetadata(chimeraResponse);

      if (this.isValidDelayOverride(overrides)) {
        return this.toMilliseconds(
          userMetadata.amount ?? (overrides.delay.amount as number),
          userMetadata.unit ?? (overrides.delay.unit as DigestUnitEnum)
        );
      }

      const regularDigestMeta = stepMetadata as IDigestRegularMetadata;

      return this.toMilliseconds(
        userMetadata.amount ?? regularDigestMeta.amount,
        userMetadata.unit ?? regularDigestMeta.unit
      );
    } else if (digestType === DigestTypeEnum.TIMED) {
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

  private getUserRegularDelayMetadata(
    chimeraResponse: IChimeraDigestResponse | IDelayOutput
  ): { amount: number; unit: DigestUnitEnum } | undefined {
    if (isUserRegular(chimeraResponse)) {
      const unit = castToDigestUnitEnum(chimeraResponse?.unit);
      const amount = chimeraResponse.amount;

      return { amount, unit };
    }

    return;
  }

  private getUserScheduledDelayMetadata(
    chimeraResponse: IChimeraDigestResponse | IDelayOutput
  ): { date: string } | undefined {
    if (isUserScheduled(chimeraResponse)) {
      return { date: chimeraResponse.date };
    }

    return;
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

  private isValidDelayOverride(overrides: any): boolean {
    if (!overrides?.delay) {
      return false;
    }

    const isDelayAmountANumber = typeof overrides.delay.amount === 'number';
    const digestUnits = Object.values(DigestUnitEnum);
    const includesValidDelayUnit = digestUnits.includes(
      overrides.delay.unit as unknown as DigestUnitEnum
    );

    return isDelayAmountANumber && includesValidDelayUnit;
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

const isUserRegular = (
  chimeraResponse: IChimeraDigestResponse | IDelayOutput
): chimeraResponse is IChimeraDigestResponse | IRegularDelay =>
  chimeraResponse?.type === 'regular' &&
  (chimeraResponse as any)?.unit &&
  (chimeraResponse as any)?.amount;

const isUserScheduled = (
  chimeraResponse: IChimeraDigestResponse | IDelayOutput
): chimeraResponse is IScheduledDelay =>
  chimeraResponse?.type === 'scheduled' && (chimeraResponse as any)?.date;

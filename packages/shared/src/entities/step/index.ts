import { CronExpressionEnum } from '../../types';

export enum DigestUnitEnum {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

export function castUnitToDigestUnitEnum(unit: string): DigestUnitEnum | undefined {
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

export enum DaysEnum {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum DigestTypeEnum {
  REGULAR = 'regular',
  BACKOFF = 'backoff',
  TIMED = 'timed',
}

export enum DelayTypeEnum {
  REGULAR = 'regular',
  /** @deprecated used in v0, use TIMED instead */
  SCHEDULED = 'scheduled',
  TIMED = 'timed',
  DYNAMIC = 'dynamic',
}

export enum MonthlyTypeEnum {
  EACH = 'each',
  ON = 'on',
}

export enum OrdinalEnum {
  FIRST = '1',
  SECOND = '2',
  THIRD = '3',
  FOURTH = '4',
  FIFTH = '5',
  LAST = 'last',
}

export enum OrdinalValueEnum {
  DAY = 'day',
  WEEKDAY = 'weekday',
  WEEKEND = 'weekend',
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
}

export interface IAmountAndUnit {
  amount: number;
  unit: DigestUnitEnum;
}

export interface IAmountAndUnitDigest {
  amount?: number;
  unit?: DigestUnitEnum;
}

export interface IDigestBaseMetadata extends IAmountAndUnitDigest {
  digestKey?: string;
  digestValue?: string;
}

export interface IDigestRegularMetadata extends IDigestBaseMetadata {
  type: DigestTypeEnum.REGULAR | DigestTypeEnum.BACKOFF;
  backoff?: boolean;
  backoffAmount?: number;
  backoffUnit?: DigestUnitEnum;
  updateMode?: boolean;
}

export interface ITimedConfig {
  atTime?: string;
  weekDays?: DaysEnum[];
  monthDays?: number[];
  ordinal?: OrdinalEnum;
  ordinalValue?: OrdinalValueEnum;
  monthlyType?: MonthlyTypeEnum;
  cronExpression?: CronExpressionEnum | string;
  untilDate?: string;
}

export interface IDigestTimedMetadata extends IDigestBaseMetadata {
  type: DigestTypeEnum.TIMED;
  timed?: ITimedConfig;
}

export interface IDelayRegularMetadata extends IAmountAndUnit {
  type: DelayTypeEnum.REGULAR;
}

export interface IDelayScheduledMetadata {
  type: DelayTypeEnum.SCHEDULED;
  delayPath: string;
}

export interface IDelayTimedMetadata {
  type: DelayTypeEnum.TIMED;
  amount: number;
  unit: DigestUnitEnum;
}

export interface IDelayDynamicMetadata {
  type: DelayTypeEnum.DYNAMIC;
  dynamicKey: string;
}

export interface IThrottleMetadata {
  type?: 'fixed' | 'dynamic';
  // Fixed throttle fields
  amount?: number;
  unit?: DigestUnitEnum;
  // Dynamic throttle fields
  dynamicKey?: string;
  // Common fields
  threshold?: number;
  throttleKey?: string;
}

export type IWorkflowStepMetadata =
  | IDigestRegularMetadata
  | IDigestTimedMetadata
  | IDelayRegularMetadata
  | IDelayScheduledMetadata
  | IDelayTimedMetadata
  | IDelayDynamicMetadata
  | IThrottleMetadata;

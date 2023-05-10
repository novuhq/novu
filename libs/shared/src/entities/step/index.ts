export enum DigestUnitEnum {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
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
  SCHEDULED = 'scheduled',
}

export interface IAmountAndUnit {
  amount: number;
  unit: DigestUnitEnum;
}

export interface IDigestBaseMetadata extends IAmountAndUnit {
  digestKey?: string;
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
  ordinal?: string;
  ordinalValue?: string;
  monthlyType?: string;
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

export type INotificationTemplateStepMetadata =
  | IDigestRegularMetadata
  | IDigestTimedMetadata
  | IDelayRegularMetadata
  | IDelayScheduledMetadata;

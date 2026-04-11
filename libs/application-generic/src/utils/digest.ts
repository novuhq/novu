import { JobEntity } from '@novu/dal';
import {
  DelayTypeEnum,
  DigestTypeEnum,
  IDelayDynamicMetadata,
  IDelayNoneMetadata,
  IDelayRegularMetadata,
  IDelayScheduledMetadata,
  IDelayTimedMetadata,
  IDigestBaseMetadata,
  IDigestNoneMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  JobStatusEnum,
  StepTypeEnum,
} from '@novu/shared';
import { getNestedValue } from './object';

export const isRegularDigest = (type: DigestTypeEnum | DelayTypeEnum) => {
  return type === DigestTypeEnum.REGULAR || type === DigestTypeEnum.BACKOFF;
};

export const isRegularDelay = (type: DelayTypeEnum) => {
  return type === DelayTypeEnum.REGULAR;
};

type DelayMetadata =
  | IDelayRegularMetadata
  | IDelayTimedMetadata
  | IDelayScheduledMetadata
  | IDelayDynamicMetadata
  | IDelayNoneMetadata
  | null
  | undefined;

export function hasDelayScheduleConfig(delayMeta: DelayMetadata): boolean {
  return Boolean(delayMeta && delayMeta.type !== DelayTypeEnum.NONE);
}

export function isNoneDelay(delayMeta: DelayMetadata): boolean {
  return delayMeta?.type === DelayTypeEnum.NONE;
}

export const isMainDigest = (type: StepTypeEnum | undefined, status: JobStatusEnum) => {
  return type === StepTypeEnum.DIGEST && status === JobStatusEnum.DELAYED;
};

type DigestMetadata = IDigestBaseMetadata | IDigestTimedMetadata | IDigestNoneMetadata | null | undefined;

export function hasDigestScheduleConfig(digestMeta: DigestMetadata): boolean {
  return Boolean(digestMeta && digestMeta.type !== DigestTypeEnum.NONE);
}

export function isNoneDigest(digestMeta: DigestMetadata): boolean {
  return digestMeta?.type === DigestTypeEnum.NONE;
}

export function isActionStepType(type: StepTypeEnum) {
  const channels = [StepTypeEnum.DELAY, StepTypeEnum.DIGEST, StepTypeEnum.THROTTLE];

  return channels.find((channel) => channel === type);
}

export function isStepResolverSupportedType(type: StepTypeEnum): boolean {
  return ![StepTypeEnum.TRIGGER, StepTypeEnum.CUSTOM, StepTypeEnum.HTTP_REQUEST].includes(type);
}

export function getJobDigest(job: JobEntity): {
  digestMeta: IDigestBaseMetadata | undefined;
  digestKey: string | undefined;
  digestValue: string | undefined;
} {
  const digestMeta = job.digest as IDigestRegularMetadata | undefined;
  const digestKey = digestMeta?.digestKey;
  const digestValue = getNestedValue(job.payload, digestKey);

  return {
    digestKey,
    digestMeta,
    digestValue,
  };
}

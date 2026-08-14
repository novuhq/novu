import { JobEntity } from '@novu/dal';
import {
  DelayTypeEnum,
  DigestTypeEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
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

export const isMainDigest = (type: StepTypeEnum | undefined, status: JobStatusEnum) => {
  return type === StepTypeEnum.DIGEST && status === JobStatusEnum.DELAYED;
};

export function isActionStepType(type: StepTypeEnum) {
  const channels = [StepTypeEnum.DELAY, StepTypeEnum.DIGEST, StepTypeEnum.THROTTLE, StepTypeEnum.WAIT];

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
  // Prefer the digest value persisted on the job (payload-independent matching),
  // falling back to the payload for legacy jobs that predate persisted metadata.
  const digestValue = digestMeta?.digestValue ?? getNestedValue(job.payload, digestKey);

  return {
    digestKey,
    digestMeta,
    digestValue,
  };
}

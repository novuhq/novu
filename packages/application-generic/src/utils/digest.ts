import {
  DelayTypeEnum,
  DigestTypeEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  JobStatusEnum,
  StepTypeEnum,
} from '@novu/shared';
import { getNestedValue } from './object';
import { JobEntity } from '@novu/dal';

export const isRegularDigest = (type: DigestTypeEnum | DelayTypeEnum) => {
  return type === DigestTypeEnum.REGULAR || type === DigestTypeEnum.BACKOFF;
};

export const isMainDigest = (
  type: StepTypeEnum | undefined,
  status: JobStatusEnum
) => {
  return type === StepTypeEnum.DIGEST && status === JobStatusEnum.DELAYED;
};

export function isActionStepType(type: StepTypeEnum) {
  const channels = [StepTypeEnum.DELAY, StepTypeEnum.DIGEST];

  return channels.find((channel) => channel === type);
}

export function isChannelStepType(type: StepTypeEnum) {
  const channels = [
    StepTypeEnum.IN_APP,
    StepTypeEnum.EMAIL,
    StepTypeEnum.SMS,
    StepTypeEnum.PUSH,
    StepTypeEnum.CHAT,
  ];

  return channels.find((channel) => channel === type);
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

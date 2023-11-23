import {
  DelayTypeEnum,
  DigestTypeEnum,
  JobStatusEnum,
  StepTypeEnum,
} from '@novu/shared';

export const isRegularDigest = (type: DigestTypeEnum | DelayTypeEnum) => {
  return type === DigestTypeEnum.REGULAR || type === DigestTypeEnum.BACKOFF;
};

export const isMainDigest = (
  type: StepTypeEnum | undefined,
  status: JobStatusEnum
) => {
  return type === StepTypeEnum.DIGEST && status === JobStatusEnum.DELAYED;
};

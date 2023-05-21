import { DelayTypeEnum, DigestTypeEnum } from '@novu/shared';

export const isRegularDigest = (type: DigestTypeEnum | DelayTypeEnum) => {
  return type === DigestTypeEnum.REGULAR || type === DigestTypeEnum.BACKOFF;
};

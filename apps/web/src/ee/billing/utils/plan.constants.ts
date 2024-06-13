import { ApiServiceLevelEnum } from '@novu/shared';

export const includedEventQuotaFromApiServiceLevel = {
  [ApiServiceLevelEnum.FREE]: 30000,
  [ApiServiceLevelEnum.BUSINESS]: 250000,
  [ApiServiceLevelEnum.ENTERPRISE]: 5000000,
} satisfies Partial<Record<ApiServiceLevelEnum, number>>;

export const pricePerThousandEvents = 1.2;

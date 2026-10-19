export enum ErrorEnum {
  TIER_LIMIT_EXCEEDED = 'TIER_LIMIT_EXCEEDED',
  INVALID_DEFER_DURATION = 'INVALID_DEFER_DURATION',
}

export type TierValidationError = {
  controlKey: string;
  error: ErrorEnum;
  message: string;
};

export type TierRestrictionsValidateResponse = TierValidationError[];

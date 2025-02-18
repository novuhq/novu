import { TierValidationTypeEnum } from './tier-validation-type.enum';

export class TierExceededException extends Error {
  constructor(
    public tierValidationEnum: TierValidationTypeEnum,
    message: string
  ) {
    super(message);
    this.name = 'TierExceededException';
  }
}

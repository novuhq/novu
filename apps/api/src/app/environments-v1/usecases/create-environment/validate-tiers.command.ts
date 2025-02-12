import { TierValidationTypeEnum } from './tier-validation-type.enum';

export class ValidateTiersCommand {
  organizationId: string;
  validationType: TierValidationTypeEnum;
  valueToValidate: number;
}

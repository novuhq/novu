import { HUMAN_INTERACTION_MAX_RECIPIENTS, tryNormalizeHumanTo } from '@novu/shared';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isValidHumanTo', async: false })
export class IsValidHumanTo implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return tryNormalizeHumanTo(value) !== null;
  }

  defaultMessage(): string {
    return `\`to\` must be a subscriberId string or a non-empty array of at most ${HUMAN_INTERACTION_MAX_RECIPIENTS} subscriberIds`;
  }
}

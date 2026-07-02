import { TriggerRecipientsTypeEnum } from '@novu/shared';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validates a single recipient in the `to` payload of a trigger.
 *
 * A recipient is valid when it is one of:
 * - a non-empty string (subscriberId)
 * - an object with a non-empty `subscriberId` string
 * - a topic object with a non-empty `topicKey` string
 *
 * Empty strings are explicitly rejected to prevent triggers that target
 * unidentifiable subscribers (which previously silently fell through downstream
 * filtering and never reached anyone).
 */
function isValidSingleRecipient(recipient: unknown): boolean {
  if (typeof recipient === 'string') {
    return recipient.length > 0;
  }

  if (!recipient || typeof recipient !== 'object' || Array.isArray(recipient)) {
    return false;
  }

  const obj = recipient as Record<string, unknown>;

  if (obj.type === TriggerRecipientsTypeEnum.TOPIC) {
    return typeof obj.topicKey === 'string' && obj.topicKey.length > 0;
  }

  if ('subscriberId' in obj) {
    return typeof obj.subscriberId === 'string' && obj.subscriberId.length > 0;
  }

  if ('topicKey' in obj) {
    return typeof obj.topicKey === 'string' && obj.topicKey.length > 0;
  }

  return false;
}

@ValidatorConstraint({ name: 'isTriggerRecipientsPayload', async: false })
export class IsTriggerRecipientsPayloadConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0 && value.every(isValidSingleRecipient);
    }

    return isValidSingleRecipient(value);
  }

  defaultMessage(args: ValidationArguments) {
    return (
      `${args.property} must be a non-empty subscriberId string, an object with a non-empty subscriberId, ` +
      `a topic object with a non-empty topicKey, or a non-empty array of those`
    );
  }
}

export function IsTriggerRecipientsPayload(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTriggerRecipientsPayloadConstraint,
    });
  };
}

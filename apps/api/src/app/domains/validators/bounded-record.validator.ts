import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const DOMAIN_DATA_MAX_KEYS = 10;

export const DOMAIN_DATA_MAX_TOTAL_CHARS = 500;

export function isBoundedStringRecord(
  value: unknown,
  opts: { maxKeys: number; maxTotalChars: number }
): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const entries = Object.entries(value as Record<string, unknown>);

  if (entries.length > opts.maxKeys) {
    return false;
  }

  let total = 0;

  for (const [k, v] of entries) {
    if (typeof k !== 'string' || typeof v !== 'string') {
      return false;
    }

    total += k.length + v.length;
  }

  return total <= opts.maxTotalChars;
}

function boundedRecordMessage(args: ValidationArguments, opts: { maxKeys: number; maxTotalChars: number }): string {
  return `${args.property} must be an object with at most ${opts.maxKeys} string keys and string values, with combined key+value length at most ${opts.maxTotalChars} characters.`;
}

@ValidatorConstraint({ name: 'isBoundedRecord', async: false })
class IsBoundedRecordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const opts = (args.constraints[0] as { maxKeys: number; maxTotalChars: number } | undefined) ?? {
      maxKeys: DOMAIN_DATA_MAX_KEYS,
      maxTotalChars: DOMAIN_DATA_MAX_TOTAL_CHARS,
    };

    return isBoundedStringRecord(value, opts);
  }

  defaultMessage(args: ValidationArguments): string {
    const opts = (args.constraints[0] as { maxKeys: number; maxTotalChars: number } | undefined) ?? {
      maxKeys: DOMAIN_DATA_MAX_KEYS,
      maxTotalChars: DOMAIN_DATA_MAX_TOTAL_CHARS,
    };

    return boundedRecordMessage(args, opts);
  }
}

export function IsBoundedRecord(
  opts: { maxKeys: number; maxTotalChars: number } = {
    maxKeys: DOMAIN_DATA_MAX_KEYS,
    maxTotalChars: DOMAIN_DATA_MAX_TOTAL_CHARS,
  },
  validationOptions?: ValidationOptions
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [opts],
      validator: IsBoundedRecordConstraint,
    });
  };
}


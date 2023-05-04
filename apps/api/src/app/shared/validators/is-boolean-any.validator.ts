import { IsIn, ValidationOptions } from 'class-validator';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const IsBooleanAny = (options: ValidationOptions = {}) =>
  IsIn([true, false, 'true', 'false'], {
    message: '$property must be a boolean value',
    ...options,
  });

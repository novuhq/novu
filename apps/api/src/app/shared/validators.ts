import { IsIn } from 'class-validator';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const IsBooleanAny = () =>
  IsIn([true, false, 'true', 'false'], {
    message: '$property must be a boolean value',
  });

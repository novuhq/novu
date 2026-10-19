import { Type } from 'class-transformer';
import { IsDate, IsDefined, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

function IsFutureDate(
  options?: {
    leewayMs?: number;
  },
  validationOptions?: ValidationOptions
) {
  const leewayMs = options?.leewayMs ?? 1000 * 60; // default 1 minute

  return (object: Object, propertyName: string) => {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: {
        message: `Snooze time must be at least ${leewayMs / 1000} seconds in the future`,
        ...validationOptions,
      },
      validator: {
        validate(value: Date, args: ValidationArguments) {
          if (!(value instanceof Date)) {
            return false;
          }

          const now = new Date();
          const delay = value.getTime() - now.getTime();

          return delay >= leewayMs;
        },
      },
    });
  };
}

export class SnoozeNotificationRequestDto {
  @Type(() => Date)
  @IsDate()
  @IsFutureDate({
    leewayMs: 1000 * 60,
  })
  readonly snoozeUntil: Date;
}

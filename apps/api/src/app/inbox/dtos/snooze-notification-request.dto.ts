import { IsDate, ValidationArguments, registerDecorator, ValidationOptions, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

function IsFutureDate(
  options?: {
    leewayMs?: number;
  },
  validationOptions?: ValidationOptions
) {
  const leewayMs = options?.leewayMs ?? 1000 * 60; // default 1 minute

  return function (object: Object, propertyName: string) {
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

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, registerDecorator, ValidationOptions } from 'class-validator';

function IsFutureDate(
  options?: {
    leewayMs?: number;
  },
  validationOptions?: ValidationOptions
) {
  const leewayMs = options?.leewayMs ?? 1000 * 60;

  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: {
        message: `Snooze time must be at least ${leewayMs / 1000} seconds in the future`,
        ...validationOptions,
      },
      validator: {
        validate(value: Date) {
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

export class SnoozeSubscriberNotificationDto {
  @Type(() => Date)
  @IsDate()
  @IsFutureDate({
    leewayMs: 1000 * 60,
  })
  @ApiProperty({
    description: 'The date and time until which the notification should be snoozed',
    type: Date,
    example: '2026-03-01T10:00:00Z',
  })
  readonly snoozeUntil: Date;
}

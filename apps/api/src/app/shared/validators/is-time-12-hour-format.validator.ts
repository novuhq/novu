import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsTime12HourFormat(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isTime12HourFormat',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          // Regex pattern for 12-hour format: HH:MM AM/PM
          // Accepts: 01:00 AM through 12:59 PM
          // With optional leading zero: 1:00 AM or 01:00 AM
          const time12HourRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

          return time12HourRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be in 12-hour format (e.g., 09:00 AM or 9:00 AM)`;
        },
      },
    });
  };
}

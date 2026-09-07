import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function WeeklyScheduleValidation(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'weeklyScheduleDisabled',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as { isEnabled?: boolean };

          if (obj.isEnabled === true && value && Object.keys(value).length === 0) {
            return false;
          }
          if (obj.isEnabled === true && value && Object.keys(value).some((key) => !weekdays.includes(key))) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as { isEnabled?: boolean };
          const value = args.value;

          if (obj.isEnabled === true && value && Object.keys(value).length === 0) {
            return 'weeklySchedule must contain at least one day configuration when isEnabled is true';
          }

          if (obj.isEnabled === true && value && Object.keys(value).some((key) => !weekdays.includes(key))) {
            const invalidKeys = Object.keys(value).filter((key) => !weekdays.includes(key));
            return `weeklySchedule contains invalid day names: ${invalidKeys.join(', ')}. Valid days are: ${weekdays.join(', ')}`;
          }

          return 'weeklySchedule validation failed';
        },
      },
    });
  };
}

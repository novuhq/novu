import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { addBreadcrumb } from '@sentry/node';
import { BadRequestException } from '@nestjs/common';

export abstract class BaseCommand {
  static create<T extends BaseCommand>(
    this: new (...args: unknown[]) => T,
    data: T,
  ): T {
    const convertedObject = plainToInstance<T, unknown>(this, {
      ...data,
    });

    const errors = validateSync(convertedObject as unknown as object);
    if (errors?.length) {
      const mappedErrors = errors.flatMap((item) => {
        if (!item.constraints) {
          return [];
        }

        return Object.values(item.constraints);
      });

      if (mappedErrors.length > 0) {
        addBreadcrumb({
          category: 'BaseCommand',
          data: mappedErrors,
        });

        throw new BadRequestException(mappedErrors);
      }
    }

    return convertedObject;
  }
}

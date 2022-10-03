/* eslint-disable @typescript-eslint/no-explicit-any */
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as Sentry from '@sentry/node';
import { BadRequestException, flatten } from '@nestjs/common';

export abstract class BaseCommand {
  static create<T extends BaseCommand>(
    this: new (...args: any[]) => T,
    data: T
  ): T {
    const convertedObject = plainToClass<T, any>(this, {
      ...data,
    });

    const errors = validateSync(convertedObject as unknown as object);
    if (errors?.length) {
      const mappedErrors = flatten(
        errors.map((item) => Object.values(item.constraints))
      );

      Sentry.addBreadcrumb({
        category: 'BaseCommand',
        data: mappedErrors,
      });

      throw new BadRequestException(mappedErrors);
    }

    return convertedObject;
  }
}

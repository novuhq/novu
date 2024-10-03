/* eslint-disable @typescript-eslint/no-explicit-any */
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { addBreadcrumb } from '@sentry/node';
import { flatten } from '@nestjs/common';
import { CommandValidationException } from './commandValidationException';

export abstract class BaseCommand {
  static create<T extends BaseCommand>(
    this: new (...args: any[]) => T,
    data: T,
  ): T {
    const convertedObject = plainToInstance<T, any>(this, {
      ...data,
    });

    const errors = validateSync(convertedObject as unknown as object);
    if (errors?.length) {
      const mappedErrors = flatten(
        errors.map((item) => Object.values((item as any).constraints)),
      );

      addBreadcrumb({
        category: 'BaseCommand',
        data: mappedErrors,
      });

      throw new CommandValidationException(mappedErrors);
    }

    return convertedObject;
  }
}

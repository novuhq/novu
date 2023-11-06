/* eslint-disable @typescript-eslint/no-explicit-any */
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import * as Sentry from '@sentry/node';
import { BadRequestException } from '@nestjs/common';

interface IConstraint {
  path: string[];
  constraint: string[];
}

function extractConstraints(obj: any, path: string[] = []): IConstraint[] {
  const constraints: IConstraint[] = [];

  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object') {
      const currentLocation = obj[key]?.property;
      const newPath = [...path, currentLocation];
      if (obj[key].constraints) {
        constraints.push({ path: [...newPath, key], constraint: Object.values(obj[key].constraints) });
      }
      constraints.push(...extractConstraints(obj[key].children, newPath));
    }
  }

  return constraints;
}

export abstract class BaseCommand {
  static create<T extends BaseCommand>(this: new (...args: any[]) => T, data: T): T {
    const convertedObject = plainToInstance<T, any>(this, {
      ...data,
    });

    const errors = validateSync(convertedObject as unknown as object);
    if (errors?.length) {
      const mappedErrors = extractConstraints(errors);

      Sentry.addBreadcrumb({
        category: 'BaseCommand',
        data: mappedErrors,
      });

      throw new BadRequestException(mappedErrors);
    }

    return convertedObject;
  }
}

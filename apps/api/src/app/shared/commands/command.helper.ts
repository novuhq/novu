import { ClassConstructor, plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BadRequestException, flatten } from '@nestjs/common';

export class CommandHelper {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  static create<T>(command: ClassConstructor<T>, data: any): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertedObject = plainToClass<T, any>(command, {
      ...data,
    });

    const errors = validateSync(convertedObject);
    if (errors?.length) {
      const mappedErrors = flatten(errors.map((item) => Object.values(item.constraints)));
      throw new BadRequestException(mappedErrors);
    }

    return convertedObject;
  }
}

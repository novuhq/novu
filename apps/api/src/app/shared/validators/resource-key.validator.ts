// libs/nest-validators/is-resource-key.decorator.ts

import { isResourceKey } from '@novu/shared';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsResourceKey', async: false })
export class IsResourceKeyConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    return isResourceKey(value);
  }
  defaultMessage() {
    return 'resource must be "<type>:<id>" where type ∈ {subscriber}';
  }
}

export const IsResourceKey = (opts?: ValidationOptions) => (obj: object, prop: string) =>
  registerDecorator({ target: obj.constructor, propertyName: prop, options: opts, validator: IsResourceKeyConstraint });

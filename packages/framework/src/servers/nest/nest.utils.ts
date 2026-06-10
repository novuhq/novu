import { Type } from '@nestjs/common';

export function applyDecorators<T>(baseClass: Type<T>, decorators: Array<ClassDecorator> = []): Type<T> {
  return decorators.reduce((decoratedClass, decorator) => {
    const result = decorator(decoratedClass);

    return (result ?? decoratedClass) as Type<T>;
  }, baseClass);
}

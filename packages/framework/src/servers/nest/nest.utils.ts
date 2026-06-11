import { Type } from '@nestjs/common';

export function applyDecorators<T>(baseClass: Type<T>, decorators: Array<ClassDecorator> = []): Type<T> {
  return decorators.reduce((decoratedClass, decorator) => {
    const result = decorator(decoratedClass);

    return (result ?? decoratedClass) as Type<T>;
  }, baseClass);
}

function copyReflectMetadata(from: object, to: object): void {
  for (const key of Reflect.getMetadataKeys(from) ?? []) {
    Reflect.defineMetadata(key, Reflect.getMetadata(key, from), to);
  }
}

/**
 * Apply class decorators while keeping `baseClass` as the registered controller.
 *
 * Async module registration cannot swap the controller class after the dynamic
 * module is created, so any decorator that returns a subclass has its metadata
 * copied back onto `baseClass`.
 */
export function applyDecoratorsInPlace<T>(baseClass: Type<T>, decorators: Array<ClassDecorator> = []): void {
  const decoratedClass = applyDecorators(baseClass, decorators);

  if (decoratedClass !== baseClass) {
    copyReflectMetadata(decoratedClass, baseClass);
  }
}

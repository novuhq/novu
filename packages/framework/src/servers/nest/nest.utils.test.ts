import { describe, expect, it } from 'vitest';
import { NovuController } from './nest.controller';
import { applyDecorators, applyDecoratorsInPlace } from './nest.utils';

describe('applyDecorators', () => {
  it('should chain decorator return values', () => {
    const firstKey = Symbol('novu-first-decorator');
    const secondKey = Symbol('novu-second-decorator');
    const firstDecorator = (): ClassDecorator => (target) => {
      Reflect.defineMetadata(firstKey, 'first', target);

      return class extends (target as typeof NovuController) {};
    };
    const secondDecorator = (): ClassDecorator => (target) => {
      Reflect.defineMetadata(secondKey, 'second', target);
    };

    const decoratedClass = applyDecorators(NovuController, [firstDecorator(), secondDecorator()]);

    expect(decoratedClass).not.toBe(NovuController);
    expect(Reflect.getMetadata(secondKey, decoratedClass)).toBe('second');
  });
});

describe('applyDecoratorsInPlace', () => {
  it('should copy metadata from class-replacing decorators onto the base controller', () => {
    const metadataKey = Symbol('novu-replaced-class-decorator');
    const replacingDecorator = (): ClassDecorator => (target) => {
      const replacedClass = class extends (target as typeof NovuController) {};

      Reflect.defineMetadata(metadataKey, 'replaced', replacedClass);

      return replacedClass;
    };

    applyDecoratorsInPlace(NovuController, [replacingDecorator()]);

    expect(Reflect.getMetadata(metadataKey, NovuController)).toBe('replaced');
  });
});

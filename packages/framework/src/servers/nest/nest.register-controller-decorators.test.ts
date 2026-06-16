import { describe, expect, it } from 'vitest';
import { NovuController } from './nest.controller';
import { registerControllerDecorators } from './nest.register-controller-decorators';

describe('registerControllerDecorators', () => {
  it('should apply controller decorators from async module options', () => {
    const metadataKey = Symbol('novu-test-controller-decorator');
    const testDecorator = (): ClassDecorator => (target) => {
      Reflect.defineMetadata(metadataKey, true, target);
    };

    registerControllerDecorators.useFactory({
      apiPath: '/novu/bridge',
      workflows: [],
      controllerDecorators: [testDecorator()],
    });

    expect(Reflect.getMetadata(metadataKey, NovuController)).toBe(true);
  });

  it('should chain decorator return values onto NovuController', () => {
    const firstKey = Symbol('novu-async-first-decorator');
    const secondKey = Symbol('novu-async-second-decorator');
    const firstDecorator = (): ClassDecorator => (target) => {
      Reflect.defineMetadata(firstKey, 'first', target);

      return class extends (target as typeof NovuController) {};
    };
    const secondDecorator = (): ClassDecorator => (target) => {
      Reflect.defineMetadata(secondKey, 'second', target);
    };

    registerControllerDecorators.useFactory({
      apiPath: '/novu/bridge',
      workflows: [],
      controllerDecorators: [firstDecorator(), secondDecorator()],
    });

    expect(Reflect.getMetadata(secondKey, NovuController)).toBe('second');
  });

  it('should no-op when controllerDecorators is omitted', () => {
    expect(() =>
      registerControllerDecorators.useFactory({
        apiPath: '/novu/bridge',
        workflows: [],
      })
    ).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { NovuController } from './nest.controller';
import { registerControllerDecorators } from './nest.register-controller-decorators';

describe('registerControllerDecorators', () => {
  it('should apply controller decorators from async module options', () => {
    const metadataKey = Symbol('novu-test-controller-decorator');
    const testDecorator =
      (): ClassDecorator =>
      (target) => {
        Reflect.defineMetadata(metadataKey, true, target);
      };

    registerControllerDecorators.useFactory({
      apiPath: '/novu/bridge',
      workflows: [],
      controllerDecorators: [testDecorator()],
    });

    expect(Reflect.getMetadata(metadataKey, NovuController)).toBe(true);
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

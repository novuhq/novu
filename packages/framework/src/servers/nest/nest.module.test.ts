import { describe, expect, it } from 'vitest';
import { REGISTER_CONTROLLER_DECORATORS } from './nest.constants';
import { NovuModule } from './nest.module';
import { registerControllerDecorators } from './nest.register-controller-decorators';

describe('NovuModule', () => {
  it('should include registerControllerDecorators provider in registerAsync', () => {
    const dynamicModule = NovuModule.registerAsync({
      useFactory: () => ({
        apiPath: '/novu/bridge',
        workflows: [],
      }),
    });

    expect(dynamicModule.controllers).toEqual(expect.arrayContaining([expect.any(Function)]));
    expect(dynamicModule.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provide: REGISTER_CONTROLLER_DECORATORS,
          useFactory: registerControllerDecorators.useFactory,
        }),
      ])
    );
  });
});

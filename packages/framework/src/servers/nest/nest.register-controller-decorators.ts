import { FactoryProvider } from '@nestjs/common';
import { NOVU_OPTIONS, REGISTER_CONTROLLER_DECORATORS } from './nest.constants';
import { NovuController } from './nest.controller';
import { OPTIONS_TYPE } from './nest.module-definition';
import { applyDecoratorsInPlace } from './nest.utils';

/**
 * Apply controller decorators resolved from async module options.
 *
 * A custom provider is necessary because `controllerDecorators` are only
 * available after the async options factory runs, while NestJS requires
 * controllers to be declared when the dynamic module is created.
 *
 * This mirrors the `registerApiPath` pattern used for dynamic controller paths.
 */
export const registerControllerDecorators: FactoryProvider = {
  provide: REGISTER_CONTROLLER_DECORATORS,
  useFactory: (options: typeof OPTIONS_TYPE) => {
    applyDecoratorsInPlace(NovuController, options.controllerDecorators ?? []);
  },
  inject: [NOVU_OPTIONS],
};

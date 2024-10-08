import { FactoryProvider } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { NovuController } from './nest.controller';
import { REGISTER_API_PATH, NOVU_OPTIONS } from './nest.constants';
import { OPTIONS_TYPE } from './nest.module-definition';

/**
 * Workaround to dynamically set the path for the controller.
 *
 * A custom provider is necessary to ensure that the controller path is set during
 * application initialization, because NestJS does not support declaration of
 * paths after the application has been initialized.
 *
 * @see https://github.com/nestjs/nest/issues/1438#issuecomment-863446608
 */
export const registerApiPath: FactoryProvider = {
  provide: REGISTER_API_PATH,
  useFactory: (options: typeof OPTIONS_TYPE) => {
    if (!options.apiPath) {
      throw new Error('`apiPath` must be provided to set the controller path');
    }

    Reflect.defineMetadata(PATH_METADATA, options.apiPath, NovuController);
  },
  inject: [NOVU_OPTIONS],
};

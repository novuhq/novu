import { FactoryProvider } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { NovuController } from './nest.controller';
import { API_PATH, REGISTER_CONTROLLER_PATH } from './nest.constants';

/**
 * Workaround to dynamically set the path for the controller.
 *
 * A custom provider is necessary to ensure that the controller path is set during
 * application initialization, because NestJS does not support declaration of
 * paths after the application has been initialized.
 *
 * @see https://github.com/nestjs/nest/issues/1438#issuecomment-863446608
 */
export const registerControllerPath: FactoryProvider = {
  provide: REGISTER_CONTROLLER_PATH,
  useFactory: (apiPath: string) => {
    if (!apiPath) {
      throw new Error('`apiPath` must be provided to set the controller path');
    }

    Reflect.defineMetadata(PATH_METADATA, apiPath, NovuController);
  },
  inject: [API_PATH],
};

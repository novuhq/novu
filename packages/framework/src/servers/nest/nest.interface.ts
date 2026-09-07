import type { ServeHandlerOptions } from '../../handler';

export type NovuModuleOptions = ServeHandlerOptions & {
  apiPath: string;
  controllerDecorators?: ClassDecorator[];
};

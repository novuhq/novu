import { createNestLoggingModuleOptions, PinoLogger } from '@novu/application-generic';
import packageJson from '../../../../package.json';

let loggerInstance: PinoLogger | null = null;

export const getLogger = () => {
  if (!loggerInstance) {
    loggerInstance = new PinoLogger(
      createNestLoggingModuleOptions({
        serviceName: packageJson.name,
        version: packageJson.version,
        silent: true,
      })
    );
  }

  loggerInstance.setContext('Application');

  return loggerInstance;
};

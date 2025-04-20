import { createNestLoggingModuleOptions, PinoLogger } from '@novu/application-generic';
import packageJson from '../../../../package.json';

export const getLogger = (context: string) => {
  const logger = new PinoLogger(
    createNestLoggingModuleOptions({
      serviceName: packageJson.name,
      version: packageJson.version,
    })
  );
  logger.setContext(context);

  return logger;
};

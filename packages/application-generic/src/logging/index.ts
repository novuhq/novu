import { LoggerErrorInterceptor, LoggerModule, PinoLogger } from 'nestjs-pino';
import { DynamicModule, RequestMethod } from '@nestjs/common';

const loggingLevelArr = ['error', 'warn', 'info', 'verbose', 'debug'];

const loggingLevels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
};

interface ILoggingVariables {
  env: string;
  level: string;

  hostingPlatform: string;
  tenant: string;
}

// TODO: should be moved into a config framework
function getLoggingVariables(): ILoggingVariables {
  // eslint-disable-next-line no-console
  console.log('Env: ' + process.env.NODE_ENV);
  let env = process.env.NODE_ENV;
  env ??= 'local';

  let logLevel = process.env.LOGGING_LEVEL;
  logLevel ??= 'info';
  if (loggingLevelArr.indexOf(logLevel) === -1) {
    // eslint-disable-next-line no-console
    console.log(
      logLevel +
        'is not a valid log level of ' +
        loggingLevelArr +
        '. Reverting to info.'
    );
    logLevel = 'info';
  }
  // eslint-disable-next-line no-console
  console.log('Log Level: ' + logLevel);

  let hostingPlatform = process.env.HOSTING_PLATFORM;
  hostingPlatform ??= 'Docker';
  // eslint-disable-next-line no-console
  console.log('Platform: ' + hostingPlatform);

  let tenant = process.env.TENANT;
  tenant ??= 'OS';
  // eslint-disable-next-line no-console
  console.log('Tenant: ' + tenant);

  return {
    env,
    level: logLevel,
    hostingPlatform,
    tenant,
  };
}

export function createNestLoggingModuleOptions(settings: ILoggerSettings) {
  const values = getLoggingVariables();

  return {
    pinoHttp: {
      level: values.level,
      redact: {
        paths: ['req.headers.authorization'],
        remove: true,
      },
      base: {
        pid: process.pid,
        serviceName: settings.serviceName,
        serviceVersion: settings.version,
        platform: values.hostingPlatform,
        tenant: values.tenant,
      },
      transport: ['local', 'test'].includes(process.env.NODE_ENV)
        ? { target: 'pino-pretty' }
        : undefined,
      autoLogging: !['local', 'test'].includes(process.env.NODE_ENV),
    },
  };
}

interface ILoggerSettings {
  serviceName: string;
  version: string;
}

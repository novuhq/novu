import {
  LoggerErrorInterceptor,
  Logger,
  LoggerModule,
  PinoLogger,
} from 'nestjs-pino';
import { storage, Store } from 'nestjs-pino/storage';
import * as process from 'process';
export * from './log.decorator';
export * from './masking';

export function getErrorInterceptor() {
  return new LoggerErrorInterceptor();
}
export { Logger, LoggerModule, PinoLogger, storage, Store };

/*
 * todo add verbose to pino logger
 * todo make debug higher then trace(verbose)
 */
const loggingLevelArr = ['error', 'warn', 'info', 'verbose', 'debug'];

const loggingLevelSet = {
  error: 50,
  warn: 40,
  info: 30,
  verbose: 20,
  debug: 10,
};

interface ILoggingVariables {
  env: string;
  level: string;

  hostingPlatform: string;
  tenant: string;
}

function getLogLevel() {
  let logLevel = process.env.LOGGING_LEVEL ?? 'info';

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
  console.log('Logging Level: ' + logLevel);

  return logLevel;
}

// TODO: should be moved into a config framework
function getLoggingVariables(): ILoggingVariables {
  const env = process.env.NODE_ENV ?? 'local';

  // eslint-disable-next-line no-console
  console.log('Env: ' + env);

  const hostingPlatform = process.env.HOSTING_PLATFORM ?? 'Docker';

  // eslint-disable-next-line no-console
  console.log('Platform: ' + hostingPlatform);

  const tenant = process.env.TENANT ?? 'OS';

  // eslint-disable-next-line no-console
  console.log('Tenant: ' + tenant);

  return {
    env,
    level: getLogLevel(),
    hostingPlatform,
    tenant,
  };
}

export function createNestLoggingModuleOptions(settings: ILoggerSettings) {
  const values = getLoggingVariables();

  return {
    pinoHttp: {
      customLevels: loggingLevelSet,
      // useOnlyCustomLevels: true,
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
      transport: ['local', 'test', 'debug'].includes(process.env.NODE_ENV)
        ? { target: 'pino-pretty' }
        : undefined,
      autoLogging: !['test'].includes(process.env.NODE_ENV),
    },
  };
}

interface ILoggerSettings {
  serviceName: string;
  version: string;
}

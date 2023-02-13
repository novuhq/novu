import * as winston from 'winston';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from '@nestjs/common';

const loggingLevelArr = ['error', 'warn', 'info', 'verbose', 'debug'];

const loggingLevels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
};

const loggingFormat = {
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata(),
    winston.format.ms(),
    winston.format.json()
  ),
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

function createWinstonOptions(settings: ILoggerSettings) {
  const values = getLoggingVariables();

  const transports =
    values.env === 'local' || values.env === 'test'
      ? [new winston.transports.Console(loggingFormat)]
      : [];

  return {
    level: values.level,
    levels: loggingLevels,
    defaultMeta: {
      Service: settings.serviceName,
      Version: settings.version,
      hostingPlatform: values.hostingPlatform,
      tenant: values.tenant,
    },
    transports: transports,
    exitOnError: false,
    rejectionHandlers: transports,
  };
}

interface ILoggerSettings {
  serviceName: string;
  version: string;
}

export function createLogger(settings: ILoggerSettings) {
  return winston.createLogger(createWinstonOptions(settings));
}

export function createNestLogger(settings: ILoggerSettings) {
  return WinstonModule.createLogger(createWinstonOptions(settings));
}

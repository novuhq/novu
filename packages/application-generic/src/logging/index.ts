import { NestInterceptor } from '@nestjs/common';
import {
  LoggerErrorInterceptor,
  Logger,
  LoggerModule,
  PinoLogger,
  getLoggerToken,
  Params,
} from 'nestjs-pino';
import { storage, Store } from 'nestjs-pino/storage';
import { sensitiveFields } from './masking';
export * from './LogDecorator';

export function getErrorInterceptor(): NestInterceptor {
  return new LoggerErrorInterceptor();
}
export { Logger, LoggerModule, PinoLogger, storage, Store, getLoggerToken };

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

export function getLogLevel() {
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

  return logLevel;
}

// TODO: should be moved into a config framework
function getLoggingVariables(): ILoggingVariables {
  const env = process.env.NODE_ENV ?? 'local';

  // eslint-disable-next-line no-console
  console.log('Environment: ' + env);

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

export function createNestLoggingModuleOptions(
  settings: ILoggerSettings
): Params {
  const values = getLoggingVariables();

  let redactFields: string[] = sensitiveFields.map((val) => val);

  redactFields.push('req.headers.authorization');

  const baseWildCards = '*.';
  const baseArrayWildCards = '*[*].';
  for (let i = 1; i <= 6; i++) {
    redactFields = redactFields.concat(
      sensitiveFields.map((val) => baseWildCards.repeat(i) + val)
    );

    redactFields = redactFields.concat(
      sensitiveFields.map((val) => baseArrayWildCards.repeat(i) + val)
    );
  }

  const transport = ['local', 'test', 'debug'].includes(process.env.NODE_ENV)
    ? { target: 'pino-pretty' }
    : undefined;

  // eslint-disable-next-line no-console
  console.log(
    'Selected Log Transport ' + (!transport ? 'None' : 'pino-pretty')
  );

  return {
    pinoHttp: {
      customLevels: loggingLevelSet,
      level: values.level,
      redact: {
        paths: redactFields,
        censor: '[REDACTED]',
      },
      base: {
        pid: process.pid,
        serviceName: settings.serviceName,
        serviceVersion: settings.version,
        platform: values.hostingPlatform,
        tenant: values.tenant,
      },
      transport: transport,
      autoLogging: !['test', 'local'].includes(process.env.NODE_ENV),
      customProps: (req: any, res: any) => ({
        user: {
          userId: req?.user?._id || null,
          environmentId: req?.user?.environmentId || null,
          organizationId: req?.user?.organizationId || null,
        },
        authScheme: req?.authScheme,
        rateLimitPolicy: res?.rateLimitPolicy,
      }),
    },
  };
}

interface ILoggerSettings {
  serviceName: string;
  version: string;
}

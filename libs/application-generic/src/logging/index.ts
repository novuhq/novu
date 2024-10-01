import { NestInterceptor, RequestMethod } from '@nestjs/common';
import {
  getLoggerToken,
  Logger,
  LoggerErrorInterceptor,
  LoggerModule,
  Params,
  PinoLogger,
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
      `${logLevel}is not a valid log level of ${loggingLevelArr}. Reverting to info.`,
    );

    logLevel = 'info';
  }
  // eslint-disable-next-line no-console
  console.log(`Log Level Chosen: ${logLevel}`);

  return logLevel;
}

// TODO: should be moved into a config framework
function getLoggingVariables(): ILoggingVariables {
  const env = process.env.NODE_ENV ?? 'local';

  // eslint-disable-next-line no-console
  console.log(`Environment: ${env}`);

  const hostingPlatform = process.env.HOSTING_PLATFORM ?? 'Docker';

  // eslint-disable-next-line no-console
  console.log(`Platform: ${hostingPlatform}`);

  const tenant = process.env.TENANT ?? 'OS';

  // eslint-disable-next-line no-console
  console.log(`Tenant: ${tenant}`);

  return {
    env,
    level: getLogLevel(),
    hostingPlatform,
    tenant,
  };
}

export function createNestLoggingModuleOptions(
  settings: ILoggerSettings,
): Params {
  const values: ILoggingVariables = getLoggingVariables();

  let redactFields: string[] = sensitiveFields.map((val) => val);

  redactFields.push('req.headers.authorization');

  const baseWildCards = '*.';
  const baseArrayWildCards = '*[*].';
  for (let i = 1; i <= 6; i += 1) {
    redactFields = redactFields.concat(
      sensitiveFields.map((val) => baseWildCards.repeat(i) + val),
    );

    redactFields = redactFields.concat(
      sensitiveFields.map((val) => baseArrayWildCards.repeat(i) + val),
    );
  }

  const transport = ['local', 'test', 'debug'].includes(process.env.NODE_ENV)
    ? { target: 'pino-pretty' }
    : undefined;

  // eslint-disable-next-line no-console
  console.log(loggingLevelSet);

  // eslint-disable-next-line no-console
  console.log(
    `Selected Log Transport ${!transport ? 'None' : 'pino-pretty'}`,
    loggingLevelSet,
  );

  return {
    exclude: [{ path: '*/health-check', method: RequestMethod.GET }],
    pinoHttp: {
      customLevels: loggingLevelSet,
      level: values.level,
      redact: {
        paths: redactFields,
        censor: customRedaction,
      },
      base: {
        pid: process.pid,
        serviceName: settings.serviceName,
        serviceVersion: settings.version,
        platform: values.hostingPlatform,
        tenant: values.tenant,
      },
      transport,
      autoLogging: !['test', 'local'].includes(process.env.NODE_ENV),
      /**
       * These custom props are only added to 'request completed' and 'request errored' logs.
       * Logs generated during request processing won't have these props by default.
       * To include these or any other custom props in mid-request logs,
       * use `PinoLogger.assign(<props>)` explicitly before logging.
       */
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

const customRedaction = (value: any, path: string[]) => {
  /*
   * Logger.
   * if (obj.email && typeof obj.email === 'string') {
   *   obj.email = '[REDACTED]';
   * }
   *
   * return JSON.parse(JSON.stringify(obj));
   */
};

interface ILoggerSettings {
  serviceName: string;
  version: string;
}

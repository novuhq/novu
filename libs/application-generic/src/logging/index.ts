import { NestInterceptor, RequestMethod } from '@nestjs/common';
import { getLoggerToken, Logger, LoggerErrorInterceptor, LoggerModule, Params, PinoLogger } from 'nestjs-pino';
import { Store, storage } from 'nestjs-pino/storage';
import { sensitiveFields } from './masking';

export * from './LogDecorator';
export { getLoggerToken, Logger, LoggerModule, PinoLogger, storage, Store };

export function getErrorInterceptor(): NestInterceptor {
  return new LoggerErrorInterceptor();
}

const loggingLevelSet = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  none: 70,
};
const loggingLevelArr = Object.keys(loggingLevelSet);

export function getLogLevel() {
  let logLevel = null;

  if (process.env.LOGGING_LEVEL || process.env.LOG_LEVEL) {
    logLevel = process.env.LOGGING_LEVEL || process.env.LOG_LEVEL;
  } else {
    console.log(`Environment variable LOG_LEVEL is not set. Falling back to info level.`);
    logLevel = 'info';
  }

  if (!loggingLevelArr.includes(logLevel)) {
    console.log(`${logLevel}is not a valid log level of ${loggingLevelArr}. Falling back to info level.`);

    return 'info';
  }

  return logLevel;
}

export function createNestLoggingModuleOptions(settings: {
  serviceName: string;
  version: string;
  silent?: boolean;
}): Params {
  let redactFields: string[] = sensitiveFields;
  redactFields.push('req.headers.authorization');
  const baseWildCards = '*.';
  const baseArrayWildCards = '*[*].';
  for (let i = 1; i <= 6; i += 1) {
    redactFields = redactFields.concat(sensitiveFields.map((val) => baseWildCards.repeat(i) + val));
    redactFields = redactFields.concat(sensitiveFields.map((val) => baseArrayWildCards.repeat(i) + val));
  }

  const configSet = {
    transport: ['local', 'test', 'debug'].includes(process.env.NODE_ENV) ? { target: 'pino-pretty' } : undefined,
    platform: process.env.HOSTING_PLATFORM ?? 'Docker',
    tenant: process.env.TENANT ?? 'OS',
    level: getLogLevel(),
    levels: loggingLevelSet,
  };

  if (!settings.silent) {
    console.log('Logging Configuration:', {
      level: configSet.level,
      environment: process.env.NODE_ENV,
      transport: !configSet.transport ? 'None' : 'pino-pretty',
      platform: configSet.platform,
      tenant: configSet.tenant,
      levels: JSON.stringify(configSet.levels),
    });
  }

  return {
    exclude: [{ path: '*/health-check', method: RequestMethod.GET }],
    assignResponse: true,
    pinoHttp: {
      useOnlyCustomLevels: true,
      customLevels: configSet.levels,
      level: configSet.level,
      redact: {
        paths: redactFields,
        censor() {
          /**
           * This makes sure that the redact doesn't mutate the original object
           * And only does it on the object that is being logged,
           * It's strange but it works. No return value needed.
           */
        },
      },
      base: {
        pid: process.pid,
        serviceName: settings.serviceName,
        serviceVersion: settings.version,
        platform: configSet.platform,
        tenant: configSet.tenant,
      },
      transport: configSet.transport,
      autoLogging: !['test'].includes(process.env.NODE_ENV),
    },
  };
}

import { NestInterceptor, RequestMethod } from '@nestjs/common';
import { getLoggerToken, Logger, LoggerErrorInterceptor, LoggerModule, Params, PinoLogger } from 'nestjs-pino';
import { Store, storage } from 'nestjs-pino/storage';
import type { Options as PinoHttpOptions } from 'pino-http';
import { env } from '../config/env';
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
  const logLevel = env.LOGGING_LEVEL || env.LOG_LEVEL;

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
  // Extra fields bound to every log line written while handling an HTTP request.
  customProps?: PinoHttpOptions['customProps'];
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
    transport: ['local', 'test', 'debug'].includes(env.NODE_ENV) ? { target: 'pino-pretty' } : undefined,
    platform: env.HOSTING_PLATFORM,
    tenant: env.TENANT,
    level: getLogLevel(),
    levels: loggingLevelSet,
  };

  if (!settings.silent) {
    console.log('Logging Configuration:', {
      level: configSet.level,
      environment: env.NODE_ENV,
      transport: !configSet.transport ? 'None' : 'pino-pretty',
      platform: configSet.platform,
      tenant: configSet.tenant,
      levels: JSON.stringify(configSet.levels),
    });
  }

  return {
    exclude: [
      { path: '*/health-check', method: RequestMethod.GET },
      { path: '/v1/internal/subscriber-online-state', method: RequestMethod.POST },
    ],
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
      autoLogging: false,
      customProps: settings.customProps,
    },
  };
}

import { LoggerService } from '@nestjs/common';

export function throwAndLog(err: Error, logger: LoggerService) {
  logger.error(err);
  throw err;
}

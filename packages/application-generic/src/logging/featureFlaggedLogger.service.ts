import { Injectable, Logger } from '@nestjs/common';
import { Params, PinoLogger, Logger as PLogger } from 'nestjs-pino';
import { SystemFlagsEnum } from '@novu/shared';
import { FeatureFlagsService } from '../services';

const LOG_CONTEXT = 'LoggingService';

@Injectable()
export class FeatureFlaggedLogger extends PLogger {
  constructor(
    logger: PinoLogger,
    params: Params
    // private ld: FeatureFlagsService
  ) {
    console.log('IN FF constructor');
    super(logger, params);
    // this.createListener();
  }

  public createListener() {
    console.log('set up subscribe');
    // this.ld.subscribe<string>(SystemFlagsEnum.LOGGING_LEVEL, (value) => {
    //   Logger.warn(`Launch Darky has changed logging level to ${value}`);
    //
    //   PinoLogger.root.level = value;
    // });
  }
}

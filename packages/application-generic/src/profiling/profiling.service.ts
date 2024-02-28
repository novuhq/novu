import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import * as Pyroscope from '@pyroscope/nodejs';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class ProfilingService implements OnModuleInit, OnModuleDestroy {
  // private readonly logger = new Logger('Pyroscope');
  private initialized = false;

  constructor(
    @Inject('SERVICE_NAME') private readonly serviceName: string,
    @Inject('PYROSCOPE_URL') private readonly url: string,
    @Inject('IS_CONTINUOUS_PROFILING_ENABLED')
    private readonly enabled: boolean,
    private logger: PinoLogger
  ) {}

  async collectCPU() {
    return await Pyroscope.collectCpu();
  }

  async collectHeap() {
    return await Pyroscope.collectHeap();
  }

  async onModuleDestroy() {
    if (this.initialized) {
      Pyroscope.stop();
    }
  }
  onModuleInit() {
    this.logger.debug(`Pyroscope enabled: ${this.enabled}`);
    if (this.enabled) {
      console.log('Showing up to jimmy');
      this.logger.debug(`Pyroscope url: ${this.url}`);
      this.logger.debug(`service name: ${this.serviceName}`);

      Pyroscope.init({
        serverAddress: this.url,
        appName: this.serviceName,
        tags: {},
      });

      Pyroscope.start();

      this.logger.info('Pyroscope Initialized');
      this.initialized = true;

      return;
    }

    this.logger.info('Not Initializing Pyroscope');

    return;
  }
}

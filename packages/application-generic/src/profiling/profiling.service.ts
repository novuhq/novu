import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import * as Pyroscope from '@pyroscope/nodejs';

@Injectable()
export class ProfilingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Pyroscope');
  private initialized = false;

  constructor(
    @Inject('TRACING_SERVICE_NAME') private readonly serviceName: string,
    @Inject('PYROSCOPE_URL') private readonly url: string,
    @Inject('TRACING_ENABLE_OTEL') private readonly enabled: boolean
  ) {}

  async onModuleDestroy() {
    if (this.initialized) {
      Pyroscope.stop();
    }
  }
  onModuleInit() {
    this.logger.debug(`Pyroscope enabled: ${this.enabled}`);
    if (this.enabled) {
      this.logger.debug(`Pyroscope url: ${this.url}`);
      this.logger.debug(`service name: ${this.serviceName}`);

      Pyroscope.init({
        serverAddress: this.url,
        appName: this.serviceName,
        tags: {},
      });

      Pyroscope.start();

      this.logger.log('Pyroscope Initialized');
      this.initialized = true;

      return;
    }

    this.logger.log('Not Initializing Pyroscope');

    return;
  }
}

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
  private initialized = false;

  constructor(
    @Inject('SERVICE_NAME') private readonly serviceName: string,
    @Inject('PYROSCOPE_URL') private readonly url: string,
    @Inject('IS_CONTINUOUS_PROFILING_ENABLED')
    private readonly enabled: boolean
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
    Logger.debug(`Pyroscope enabled: ${this.enabled}`);
    if (this.enabled) {
      Logger.debug(`Pyroscope url: ${this.url}`);
      Logger.debug(`service name: ${this.serviceName}`);

      Pyroscope.init({
        serverAddress: this.url,
        appName: this.serviceName,
        tags: {},
      });

      Pyroscope.start();

      Logger.log('Pyroscope Initialized');
      this.initialized = true;

      return;
    }

    Logger.log('Not Initializing Pyroscope');

    return;
  }
}

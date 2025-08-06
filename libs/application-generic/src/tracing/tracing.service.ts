import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { initializeOtelSdk } from './tracing';

@Injectable()
export class TracingService implements OnModuleInit, OnModuleDestroy {
  private otelSDKInstance: NodeSDK;

  constructor(
    @Inject('TRACING_SERVICE_NAME') private readonly serviceName: string,
    @Inject('TRACING_SERVICE_VERSION') private readonly version: string,
    @Inject('TRACING_ENABLE_OTEL') private readonly otelEnabled: boolean
  ) {}

  async onModuleDestroy() {
    if (this.otelSDKInstance) {
      await this.otelSDKInstance.shutdown();
    }
  }
  onModuleInit() {
    if (!this.hasValidParameters()) return;

    this.otelSDKInstance = initializeOtelSdk(this.serviceName, this.version);
    this.otelSDKInstance.start();
  }

  private hasValidParameters() {
    return this.serviceName && this.otelEnabled;
  }
}

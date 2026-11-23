import { DynamicModule, Module } from '@nestjs/common';
import { OpenTelemetryModule } from 'nestjs-otel';
import { env } from '../config/env';
import { TracingService } from './tracing.service';

const OtelModule = OpenTelemetryModule.forRoot({
  metrics: {
    hostMetrics: true,
    apiMetrics: {
      enable: true,
      ignoreRoutes: ['/favicon.ico', '/v1/health-check'],
      ignoreUndefinedRoutes: true,
    },
  },
});

@Module({})
export class TracingModule {
  static register(serviceName: string, _version: string): DynamicModule {
    const otelEnabled = env.ENABLE_OTEL;

    return {
      module: TracingModule,
      imports: otelEnabled ? [OtelModule] : [],
      providers: otelEnabled ? [TracingService] : [],
    };
  }
}

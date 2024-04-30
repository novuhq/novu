import { DynamicModule, Module } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { OpenTelemetryModule } from 'nestjs-otel';

// eslint-disable-next-line @typescript-eslint/naming-convention
const OtelModule = OpenTelemetryModule.forRoot({
  metrics: {
    hostMetrics: true,
    apiMetrics: {
      enable: true,
      ignoreRoutes: ['/favicon.ico', '/v1/health-check'],
      //Records metrics for all URLs, even undefined ones
      ignoreUndefinedRoutes: true,
    },
  },
});

@Module({})
export class TracingModule {
  static register(serviceName: string, version: string): DynamicModule {
    return {
      module: TracingModule,
      imports: [OtelModule],
      providers: [
        TracingService,
        { provide: 'TRACING_SERVICE_NAME', useValue: serviceName },
        { provide: 'TRACING_SERVICE_VERSION', useValue: version },
        {
          provide: 'TRACING_ENABLE_OTEL',
          useValue: process.env.ENABLE_OTEL === 'true',
        },
      ],
    };
  }
}

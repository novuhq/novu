import { DynamicModule, Module } from '@nestjs/common';
import { ProfilingService } from './profiling.service';
import * as process from 'process';

@Module({
  imports: [],
})
export class ProfilingModule {
  static register(serviceName: string): DynamicModule {
    return {
      module: ProfilingModule,
      imports: [],
      providers: [
        ProfilingService,
        {
          provide: 'TRACING_SERVICE_NAME',
          useValue: serviceName,
        },
        {
          provide: 'TRACING_ENABLE_OTEL',
          useValue: process.env.TRACING_ENABLE_OTEL,
        },
        {
          provide: 'PYROSCOPE_URL',
          useValue: process.env.PYROSCOPE_URL,
        },
        {
          provide: 'IS_CONTINUOUS_PROFILING_ENABLED',
          useValue: process.env.IS_CONTINUOUS_PROFILING_ENABLED,
        },
      ],
    };
  }
}

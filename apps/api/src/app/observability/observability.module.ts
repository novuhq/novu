import { Module } from '@nestjs/common';
import { ObservabilityController } from './observability.controller';
import { GetHttpLogs } from './usecases/get-http-logs/get-http-logs.usecase';
import { SharedModule } from '../shared/shared.module';

const USE_CASES = [GetHttpLogs];

@Module({
  imports: [SharedModule],
  controllers: [ObservabilityController],
  providers: [...USE_CASES],
})
export class ObservabilityModule {}

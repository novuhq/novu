import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { LogsController } from './logs.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [LogsController],
})
export class LogsModule {}

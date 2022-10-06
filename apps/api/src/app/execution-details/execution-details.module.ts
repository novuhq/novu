import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { ExecutionDetailsController } from './execution-details.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [ExecutionDetailsController],
})
export class ExecutionDetailsModule {}

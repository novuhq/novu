import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { USE_CASES } from './usecases';
import { ExecutionDetailsController } from './execution-details.controller';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [ExecutionDetailsController],
})
export class ExecutionDetailsModule {}

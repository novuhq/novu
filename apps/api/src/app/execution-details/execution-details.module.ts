import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { ExecutionDetailsController } from './execution-details.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [ExecutionDetailsController],
})
export class ExecutionDetailsModule {}

import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { ResourceThrottlerInterceptor } from './guards';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES, ResourceThrottlerInterceptor],
  exports: [...USE_CASES, ResourceThrottlerInterceptor],
})
export class ResourceLimitingModule {}

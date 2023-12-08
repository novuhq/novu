import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiRateLimitInterceptor } from './guards';

@Module({
  imports: [
    SharedModule,
    ThrottlerModule.forRoot([
      // The following configuration is required for the NestJS ThrottlerModule to work. It has no effect.
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  providers: [...USE_CASES, ApiRateLimitInterceptor],
  exports: [...USE_CASES, ApiRateLimitInterceptor],
})
export class RateLimitingModule {}

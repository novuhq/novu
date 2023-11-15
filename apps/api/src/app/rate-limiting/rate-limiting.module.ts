import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiRateLimitGuard } from './guards';

@Module({
  imports: [
    SharedModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  providers: [...USE_CASES, ApiRateLimitGuard],
  exports: [...USE_CASES, ApiRateLimitGuard],
})
export class RateLimitingModule {}

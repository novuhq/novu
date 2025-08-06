import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CommunityOrganizationRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { ApiRateLimitInterceptor } from './guards';
import { USE_CASES } from './usecases';

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
  providers: [...USE_CASES, ApiRateLimitInterceptor, CommunityOrganizationRepository],
  exports: [...USE_CASES, ApiRateLimitInterceptor],
})
export class RateLimitingModule {}

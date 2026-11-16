import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { InternalController } from './internal.controller';
import { SubscriberJwtStatelessStrategy } from './subscriber-jwt-stateless.strategy';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES, SubscriberJwtStatelessStrategy],
  controllers: [InternalController],
})
export class InternalModule {}

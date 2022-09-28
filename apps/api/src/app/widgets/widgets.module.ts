import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { WidgetsController } from './widgets.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, SubscribersModule, AuthModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [WidgetsController],
})
export class WidgetsModule {}

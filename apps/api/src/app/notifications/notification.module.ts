import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationsController } from './notification.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...USE_CASES],
  controllers: [NotificationsController],
})
export class NotificationModule {}

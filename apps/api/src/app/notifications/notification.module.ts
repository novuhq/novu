import { Module } from '@nestjs/common';
import { MetricsModule } from '@novu/application-generic';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationsController } from './notification.controller';
import { NotificationFeedV2Reader } from './services/notification-feed-v2-reader.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule, MetricsModule],
  providers: [...USE_CASES, NotificationFeedV2Reader],
  controllers: [NotificationsController],
})
export class NotificationModule {}

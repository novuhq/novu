import { Module } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { USE_CASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notification.controller';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...USE_CASES, CommunityOrganizationRepository],
  controllers: [NotificationsController],
})
export class NotificationModule {}

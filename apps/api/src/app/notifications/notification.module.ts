import { Module } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationsController } from './notification.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...USE_CASES, CommunityOrganizationRepository],
  controllers: [NotificationsController],
})
export class NotificationModule {}

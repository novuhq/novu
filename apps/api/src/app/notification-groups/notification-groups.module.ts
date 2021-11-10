import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { NotificationGroupsController } from './notification-groups.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [NotificationGroupsController],
})
export class NotificationGroupsModule {}

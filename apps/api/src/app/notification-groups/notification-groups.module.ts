import { forwardRef, Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { NotificationGroupsController } from './notification-groups.controller';
import { SharedModule } from '../shared/shared.module';
import { ChangeModule } from '../change/change.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule), ChangeModule],
  providers: [...USE_CASES],
  controllers: [NotificationGroupsController],
  exports: [...USE_CASES],
})
export class NotificationGroupsModule {}

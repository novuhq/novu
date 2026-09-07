import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChangeModule } from '../change/change.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationGroupsController } from './notification-groups.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule), ChangeModule],
  providers: [...USE_CASES],
  controllers: [NotificationGroupsController],
  exports: [...USE_CASES],
})
export class NotificationGroupsModule {}

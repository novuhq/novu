import { forwardRef, Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { EnvironmentsController } from './environments.controller';
import { NotificationGroupsModule } from '../notification-groups/notification-groups.module';
import { AuthModule } from '../auth/auth.module';
import { LayoutsModule } from '../layouts/layouts.module';

@Module({
  imports: [SharedModule, NotificationGroupsModule, forwardRef(() => AuthModule), forwardRef(() => LayoutsModule)],
  controllers: [EnvironmentsController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class EnvironmentsModule {}

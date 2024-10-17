import { forwardRef, Module } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { EnvironmentsControllerV1 } from './environments-v1.controller';
import { NotificationGroupsModule } from '../notification-groups/notification-groups.module';
import { AuthModule } from '../auth/auth.module';
import { LayoutsModule } from '../layouts/layouts.module';
import { NovuBridgeModule } from './novu-bridge.module';

@Module({
  imports: [
    SharedModule,
    NotificationGroupsModule,
    forwardRef(() => AuthModule),
    forwardRef(() => LayoutsModule),
    NovuBridgeModule,
  ],
  controllers: [EnvironmentsControllerV1],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class EnvironmentsModuleV1 {}

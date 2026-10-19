import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { LayoutsV1Module } from '../layouts-v1/layouts-v1.module';
import { NotificationGroupsModule } from '../notification-groups/notification-groups.module';
import { SharedModule } from '../shared/shared.module';
import { EnvironmentsControllerV1 } from './environments-v1.controller';
import { NovuBridgeModule } from './novu-bridge.module';
import { USE_CASES } from './usecases';

@Module({
  imports: [
    SharedModule,
    NotificationGroupsModule,
    forwardRef(() => AuthModule),
    forwardRef(() => LayoutsV1Module),
    forwardRef(() => IntegrationModule),
    NovuBridgeModule,
  ],
  controllers: [EnvironmentsControllerV1],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class EnvironmentsModuleV1 {}

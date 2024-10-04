import { forwardRef, Module } from '@nestjs/common';
import { NovuModule } from '@novu/framework/nest';

import { Client, workflow } from '@novu/framework';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { EnvironmentsController } from './environments.controller';
import { NotificationGroupsModule } from '../notification-groups/notification-groups.module';
import { AuthModule } from '../auth/auth.module';
import { LayoutsModule } from '../layouts/layouts.module';
import { EnvironmentsBridgeController } from './environments.bridge.controller';

@Module({
  imports: [
    SharedModule,
    NotificationGroupsModule,
    forwardRef(() => AuthModule),
    forwardRef(() => LayoutsModule),
    NovuModule.register('/api/novu', {
      client: new Client({ strictAuthentication: false }),
      workflows: [
        workflow('test-1', async ({ step }) => {
          await step.email('test-email', () => ({
            subject: 'Test',
            body: 'Test',
          }));
        }),
        workflow('test-2', async ({ step }) => {
          await step.email('test-email', () => ({
            subject: 'Test',
            body: 'Test',
          }));
        }),
      ],
    }),
  ],
  controllers: [EnvironmentsController, EnvironmentsBridgeController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class EnvironmentsModule {}

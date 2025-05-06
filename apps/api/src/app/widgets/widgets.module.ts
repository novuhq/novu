import { Module } from '@nestjs/common';

import { CommunityOrganizationRepository } from '@novu/dal';
import { USE_CASES } from './usecases';
import { WidgetsController } from './widgets.controller';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';
import { IntegrationModule } from '../integrations/integrations.module';

@Module({
  imports: [SharedModule, SubscribersV1Module, AuthModule, IntegrationModule],
  providers: [...USE_CASES, CommunityOrganizationRepository],
  exports: [...USE_CASES],
  controllers: [WidgetsController],
})
export class WidgetsModule {}

import { Module } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { IntegrationsController } from './integrations.controller';
import { AuthModule } from '../auth/auth.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [SharedModule, AuthModule, FeatureFlagsModule],
  controllers: [IntegrationsController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class IntegrationModule {}

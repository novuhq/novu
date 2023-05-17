import { Module } from '@nestjs/common';

import { FeatureFlagsController } from './feature-flags.controller';

import { FeatureFlagsService, LaunchDarklyService } from './services';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

const featureFlagsService = {
  provide: FeatureFlagsService,
  useFactory: async () => {
    return new FeatureFlagsService();
  },
};

const providers = [LaunchDarklyService, featureFlagsService];

@Module({
  imports: [SharedModule, AuthModule],
  providers,
  exports: [],
  controllers: [FeatureFlagsController],
})
export class FeatureFlagsModule {}

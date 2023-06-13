import { Module } from '@nestjs/common';

import { FeatureFlagsController } from './feature-flags.controller';

import { FeatureFlagsService, LaunchDarklyService } from './services';
import { USE_CASES } from './use-cases';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

const services = [LaunchDarklyService, FeatureFlagsService];
const providers = [...USE_CASES, ...services];

@Module({
  imports: [SharedModule, AuthModule],
  providers,
  exports: providers,
  controllers: [FeatureFlagsController],
})
export class FeatureFlagsModule {}

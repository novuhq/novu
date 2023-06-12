import { Module } from '@nestjs/common';

import { FeatureFlagsController } from './feature-flags.controller';

import { FeatureFlagsService, LaunchDarklyService } from './services';
import { USE_CASES } from './use-cases';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

const providers = USE_CASES;
const services = [LaunchDarklyService, FeatureFlagsService];

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...providers, ...services],
  exports: services,
  controllers: [FeatureFlagsController],
})
export class FeatureFlagsModule {}

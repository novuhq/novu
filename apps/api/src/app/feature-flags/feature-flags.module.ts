import { Module } from '@nestjs/common';

import { FeatureFlagsController } from './feature-flags.controller';

import { FeatureFlagsService, LaunchDarklyService } from './services';
import { USE_CASES } from './use-cases';

const services = [LaunchDarklyService, FeatureFlagsService];
const providers = [...USE_CASES, ...services];

@Module({
  imports: [],
  providers,
  exports: providers,
  controllers: [FeatureFlagsController],
})
export class FeatureFlagsModule {}

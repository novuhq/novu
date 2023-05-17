import { Module } from '@nestjs/common';

import { FeatureFlagsController } from './feature-flags.controller';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [],
  exports: [],
  controllers: [FeatureFlagsController],
})
export class FeatureFlagsModule {}

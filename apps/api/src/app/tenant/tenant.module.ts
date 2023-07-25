import { Module } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { TenantController } from './tenant.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [TenantController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class TenantModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { TenantController } from './tenant.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [TenantController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class TenantModule {}

import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { USE_CASES } from './usecases';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [IntegrationsController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class IntegrationModule {}

import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [SharedModule],
  controllers: [IntegrationsController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class IntegrationModule {}

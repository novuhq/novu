import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [SharedModule],
  controllers: [IntegrationsController],
})
export class IntegrationModule {}

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { VercelIntegrationController } from './vercel-integration.controller';
import { SharedModule } from '../shared/shared.module';
import { EnvironmentsModule } from '../environments/environments.module';

@Module({
  imports: [SharedModule, HttpModule, EnvironmentsModule],
  providers: [...USE_CASES],
  controllers: [VercelIntegrationController],
})
export class VercelIntegrationModule {}

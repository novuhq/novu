import { forwardRef, Module } from '@nestjs/common';
import { ChannelFactory, CompileTemplate, CreateExecutionDetails } from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { IntegrationsController } from './integrations.controller';
import { USE_CASES } from './usecases';

const PROVIDERS = [ChannelFactory, CompileTemplate];

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule)],
  controllers: [IntegrationsController],
  providers: [...USE_CASES, CreateExecutionDetails, CommunityOrganizationRepository, ...PROVIDERS],
  exports: [...USE_CASES],
})
export class IntegrationModule {}

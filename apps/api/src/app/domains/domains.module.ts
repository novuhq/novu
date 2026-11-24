import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import { env } from '../../config/env';
import { AuthModule } from '../auth/auth.module';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { SharedModule } from '../shared/shared.module';
import { DomainsController } from './domains.controller';
import { DomainConnectDiscoveryService } from './services/domain-connect-discovery.service';
import { USE_CASES } from './usecases';

@Module({})
class DomainsModuleDefinition {}

export const DomainsModule = {
  forRoot(): DynamicModule {
    const isEnterprise = env.NOVU_ENTERPRISE === 'true' || env.CI_EE_TEST;

    if (!isEnterprise) {
      return {
        module: DomainsModuleDefinition,
      };
    }

    return {
      module: DomainsModuleDefinition,
      imports: [SharedModule, AuthModule, HttpModule, OutboundWebhooksModule.forRoot()],
      controllers: [DomainsController],
      providers: [...USE_CASES, DomainConnectDiscoveryService, ResourceValidatorService],
      exports: [...USE_CASES],
    };
  },
};

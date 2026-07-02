import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';

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
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

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

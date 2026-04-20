import { DynamicModule, Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';

import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { DomainsController } from './domains.controller';
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
      imports: [SharedModule, AuthModule],
      controllers: [DomainsController],
      providers: [...USE_CASES, ResourceValidatorService],
      exports: [...USE_CASES],
    };
  },
};

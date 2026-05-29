import { Module } from '@nestjs/common';
import { SigningSecretResolverService } from '@novu/application-generic';
import {
  ApiKeyCredentialRepository,
  EnvironmentRepository,
  ServiceAccountRepository,
  SigningSecretRepository,
} from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { ApiKeysV2EnabledGuard } from './guards/api-keys-v2-enabled.guard';
import { ServiceAccountsController } from './service-accounts.controller';
import { SigningSecretsController } from './signing-secrets.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [ServiceAccountsController, SigningSecretsController],
  providers: [
    ...USE_CASES,
    ApiKeysV2EnabledGuard,
    ServiceAccountRepository,
    ApiKeyCredentialRepository,
    SigningSecretRepository,
    EnvironmentRepository,
    SigningSecretResolverService,
  ],
  exports: [...USE_CASES, SigningSecretResolverService],
})
export class ServiceAccountsModule {}

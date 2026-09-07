import { Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { EnvironmentVariablesController } from './environment-variables.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [EnvironmentVariablesController],
  providers: [...USE_CASES, ResourceValidatorService],
  exports: [...USE_CASES],
})
export class EnvironmentVariablesModule {}

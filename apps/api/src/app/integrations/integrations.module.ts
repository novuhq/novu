import { forwardRef, Module } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { IntegrationsController } from './integrations.controller';
import { AuthModule } from '../auth/auth.module';
import { CompileTemplate, CreateExecutionDetails, QueuesModule } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule)],
  controllers: [IntegrationsController],
  providers: [...USE_CASES, CompileTemplate, CreateExecutionDetails],
  exports: [...USE_CASES],
})
export class IntegrationModule {}

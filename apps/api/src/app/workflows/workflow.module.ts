import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GetPreferences, UpsertPreferences } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { ChangeModule } from '../change/change.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationTemplateController } from './notification-template.controller';
import { USE_CASES } from './usecases';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [SharedModule, MessageTemplateModule, ChangeModule, AuthModule, IntegrationModule],
  controllers: [NotificationTemplateController, WorkflowController],
  providers: [...USE_CASES, GetPreferences, UpsertPreferences, PreferencesRepository],
  exports: [...USE_CASES],
})
export class WorkflowModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

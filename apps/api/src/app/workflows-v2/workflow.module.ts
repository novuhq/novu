import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { ChangeModule } from '../change/change.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { WorkflowController } from './workflow.controller';
import { GetWorkflowUseCase } from './usecases/get-workflow/get-workflow.usecase';
import { UpsertWorkflowUseCase } from './usecases/upsert-workflow/upsert-workflow.usecase';
import { ListWorkflowsUseCase } from './usecases/list-workflows/list-workflow.usecase';
import { DeleteWorkflowUseCase } from './usecases/delete-workflow/delete-workflow.usecase';

@Module({
  imports: [SharedModule, MessageTemplateModule, ChangeModule, AuthModule, IntegrationModule],
  controllers: [WorkflowController],
  providers: [GetWorkflowUseCase, UpsertWorkflowUseCase, ListWorkflowsUseCase, DeleteWorkflowUseCase],
  exports: [],
})
export class WorkflowV2Module implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

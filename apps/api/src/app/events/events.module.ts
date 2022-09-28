import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { WidgetsModule } from '../widgets/widgets.module';
import { AuthModule } from '../auth/auth.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { LogsModule } from '../logs/logs.module';
import { ContentTemplatesModule } from '../content-templates/content-templates.module';
import { IntegrationModule } from '../integrations/integrations.module';
/*
 * Import on USE_CASES needs to be above the import of WorkflowQueueService
 * as they depend on it
 */
// eslint-disable-next-line import/order
import { USE_CASES } from './usecases';
import { WorkflowQueueService } from './services/workflow.queue.service';
import { EventsController } from './events.controller';

@Module({
  imports: [
    SharedModule,
    TerminusModule,
    WidgetsModule,
    AuthModule,
    SubscribersModule,
    LogsModule,
    ContentTemplatesModule,
    IntegrationModule,
  ],
  controllers: [EventsController],
  providers: [...USE_CASES, WorkflowQueueService],
})
export class EventsModule {}

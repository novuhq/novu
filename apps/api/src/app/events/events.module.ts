import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { EventsController } from './events.controller';
import { USE_CASES } from './usecases';
import { WidgetsModule } from '../widgets/widgets.module';
import { AuthModule } from '../auth/auth.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { LogsModule } from '../logs/logs.module';
import { ContentTemplatesModule } from '../content-templates/content-templates.module';

@Module({
  imports: [
    SharedModule,
    TerminusModule,
    WidgetsModule,
    AuthModule,
    SubscribersModule,
    LogsModule,
    ContentTemplatesModule,
  ],
  controllers: [EventsController],
  providers: [...USE_CASES],
})
export class EventsModule {}

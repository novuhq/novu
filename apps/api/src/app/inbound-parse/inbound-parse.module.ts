import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  CompileTemplate,
  InboundParseQueueService as InboundParseQueue,
  InboundParseWorkerService as InboundParseWorker,
} from '@novu/application-generic';

import { USE_CASES } from './usecases';
import { InboundParseController } from './inbound-parse.controller';
import { InboundParseQueueService } from './services/inbound-parse.queue.service';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';
import { InboundEmailParse } from './usecases/inbound-email-parse/inbound-email-parse.usecase';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

const PROVIDERS = [InboundParseQueue, InboundParseWorker, InboundParseQueueService, GetMxRecord, CompileTemplate];

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [InboundParseController],
  providers: [...PROVIDERS, ...USE_CASES],
  exports: [...USE_CASES],
})
export class InboundParseModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

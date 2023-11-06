import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BaseApiQueuesModule, CompileTemplate } from '@novu/application-generic';

import { USE_CASES } from './usecases';
import { InboundParseController } from './inbound-parse.controller';
import { InboundParseQueueService } from './services/inbound-parse.queue.service';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

const PROVIDERS = [InboundParseQueueService, GetMxRecord, CompileTemplate];

@Module({
  imports: [SharedModule, AuthModule, BaseApiQueuesModule],
  controllers: [InboundParseController],
  providers: [...PROVIDERS, ...USE_CASES],
  exports: [...USE_CASES],
})
export class InboundParseModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

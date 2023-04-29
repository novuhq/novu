import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { InboundParseQueueService } from './services/inbound-parse.queue.service';
import { InboundParseController } from './inbound-parse.controller';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { CompileTemplate } from '@novu/application-generic';

const PROVIDERS = [InboundParseQueueService, GetMxRecord, CompileTemplate];

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [InboundParseController],
  providers: [...USE_CASES, ...PROVIDERS],
  exports: [...USE_CASES],
})
export class InboundParseModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

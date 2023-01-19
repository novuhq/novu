import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { InboundParseQueueService } from './services/inbound-parse.queue.service';

const PROVIDERS = [InboundParseQueueService];

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES, ...PROVIDERS],
  exports: [...USE_CASES],
  controllers: [],
})
export class InboundParseModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

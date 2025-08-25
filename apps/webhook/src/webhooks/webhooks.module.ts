import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [WebhooksController],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

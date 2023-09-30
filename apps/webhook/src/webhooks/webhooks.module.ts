import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { USE_CASES } from './usecases';
import { WebhooksController } from './webhooks.controller';

import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [WebhooksController],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

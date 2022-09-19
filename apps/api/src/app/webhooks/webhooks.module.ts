import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { WebhooksController } from './webhooks.controller';
import { USE_CASES } from './usecases';
import { IntegrationModule } from '../integrations/integrations.module';

@Module({
  imports: [SharedModule, IntegrationModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [WebhooksController],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

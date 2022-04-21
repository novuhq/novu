import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { NotificationTemplateController } from './notification-template.controller';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { ChangeModule } from '../change/change.module';

@Module({
  imports: [SharedModule, MessageTemplateModule, ChangeModule],
  controllers: [NotificationTemplateController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class NotificationTemplateModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

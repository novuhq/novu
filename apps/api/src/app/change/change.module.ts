import { forwardRef, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { ChangesController } from './changes.controller';
import { USE_CASES } from './usecases';
import { PromoteNotificationTemplateChange } from './usecases/promote-notification-template-change/promote-notification-template-change.usecase';

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule)],
  providers: [
    ...USE_CASES,
    {
      provide: 'INotificationTemplateChangeService',
      useExisting: PromoteNotificationTemplateChange,
    },
  ],
  exports: [...USE_CASES],
  controllers: [ChangesController],
})
export class ChangeModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

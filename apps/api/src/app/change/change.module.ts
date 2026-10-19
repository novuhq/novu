import {
  DynamicModule,
  ForwardReference,
  forwardRef,
  MiddlewareConsumer,
  Module,
  NestModule,
  Type,
} from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { ChangesController } from './changes.controller';
import { USE_CASES } from './usecases';
import { PromoteNotificationTemplateChange } from './usecases/promote-notification-template-change/promote-notification-template-change.usecase';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    if (require('@novu/ee-translation')?.EnterpriseTranslationModule) {
      modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModule);
    }
  }

  return modules;
};

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule), ...enterpriseImports()],
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

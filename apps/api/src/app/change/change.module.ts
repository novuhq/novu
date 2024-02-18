import {
  DynamicModule,
  forwardRef,
  ForwardReference,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  Type,
} from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ChangesController } from './changes.controller';
import { USE_CASES } from './usecases';
import { AuthModule } from '../auth/auth.module';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  try {
    if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
      if (require('@novu/ee-translation')?.EnterpriseTranslationModule) {
        modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModule);
      }
    }
  } catch (e) {
    Logger.error(e, `Unexpected error while importing enterprise modules`, 'EnterpriseImport');
  }

  return modules;
};

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule), ...enterpriseImports()],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [ChangesController],
})
export class ChangeModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}

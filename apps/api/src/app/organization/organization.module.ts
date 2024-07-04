import {
  MiddlewareConsumer,
  Module,
  DynamicModule,
  NestModule,
  RequestMethod,
  forwardRef,
  Logger,
  ForwardReference,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnvironmentsModule } from '../environments/environments.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { OrganizationController } from './organization.controller';
import { USE_CASES } from './usecases';
import { AuthModule } from '../auth/auth.module';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { EEOrganizationController } from './ee.organization.controller';
import { IS_CLERK_ENABLED } from '@novu/shared';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  try {
    if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
      if (require('@novu/ee-billing')?.BillingModule) {
        modules.push(require('@novu/ee-billing')?.BillingModule.forRoot());
      }
    }
  } catch (e) {
    Logger.error(e, `Unexpected error while importing enterprise modules`, 'EnterpriseImport');
  }

  return modules;
};

function getControllers() {
  if (IS_CLERK_ENABLED) {
    return [EEOrganizationController];
  }

  return [OrganizationController];
}

@Module({
  imports: [
    SharedModule,
    UserModule,
    EnvironmentsModule,
    IntegrationModule,
    forwardRef(() => AuthModule),
    ...enterpriseImports(),
  ],
  controllers: [...getControllers()],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class OrganizationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {
    if (process.env.NOVU_ENTERPRISE !== 'true' && process.env.CI_EE_TEST !== 'true') {
      consumer.apply(AuthGuard).exclude({
        method: RequestMethod.GET,
        path: '/organizations/invite/:inviteToken',
      });
    }
  }
}

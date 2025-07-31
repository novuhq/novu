import {
  DynamicModule,
  ForwardReference,
  forwardRef,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { AuthGuard } from '@nestjs/passport';
import { isClerkEnabled } from '@novu/shared';
import { AuthModule } from '../auth/auth.module';
import { EnvironmentsModuleV1 } from '../environments-v1/environments-v1.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { LayoutsV2Module } from '../layouts-v2/layouts.module';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { EEOrganizationController } from './ee.organization.controller';
import { OrganizationController } from './organization.controller';
import { USE_CASES } from './usecases';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    if (require('@novu/ee-billing')?.BillingModule) {
      modules.push(require('@novu/ee-billing')?.BillingModule.forRoot());
    }
  }

  return modules;
};

function getControllers() {
  if (isClerkEnabled()) {
    return [EEOrganizationController];
  }

  return [OrganizationController];
}

@Module({
  imports: [
    SharedModule,
    UserModule,
    EnvironmentsModuleV1,
    IntegrationModule,
    forwardRef(() => AuthModule),
    LayoutsV2Module,
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

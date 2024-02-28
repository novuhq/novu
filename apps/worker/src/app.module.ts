import { DynamicModule, HttpException, Module, Logger, Provider, Type, ForwardReference } from '@nestjs/common';
import { RavenInterceptor, RavenModule } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { SharedModule } from './app/shared/shared.module';
import { HealthModule } from './app/health/health.module';
import { WorkflowModule } from './app/workflow/workflow.module';

const baseModules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  SharedModule,
  HealthModule,
  WorkflowModule,
];

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  try {
    if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
      if (require('@novu/ee-auth')?.ChimeraConnectorModule) {
        modules.push(require('@novu/ee-auth')?.ChimeraConnectorModule);
      }
    }
  } catch (e) {
    Logger.error(e, `Unexpected error while importing enterprise modules`, 'EnterpriseImport');
  }

  return modules;
};

const enterpriseModules = enterpriseImports();

const modules = baseModules.concat(enterpriseModules);

const providers: Provider[] = [];

if (process.env.SENTRY_DSN) {
  modules.push(RavenModule);
  providers.push({
    provide: APP_INTERCEPTOR,
    useValue: new RavenInterceptor({
      filters: [
        /*
         * Filter exceptions to type HttpException. Ignore those that
         * have status code of less than 500
         */
        { type: HttpException, filter: (exception: HttpException) => exception.getStatus() < 500 },
      ],
      user: ['_id', 'firstName', 'organizationId', 'environmentId', 'roles', 'domain'],
    }),
  });
}

@Module({
  imports: modules,
  controllers: [],
  providers,
})
export class AppModule {
  constructor() {
    Logger.log(`BOOTSTRAPPED NEST APPLICATION`);
  }
}

/* eslint-disable global-require */
import { DynamicModule, HttpException, Module, Logger, Provider } from '@nestjs/common';
import { RavenInterceptor, RavenModule } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { ProfilingModule, TracingModule } from '@novu/application-generic';
import { isClerkEnabled } from '@novu/shared';
import packageJson from '../package.json';
import { SharedModule } from './app/shared/shared.module';
import { UserModule } from './app/user/user.module';
import { AuthModule } from './app/auth/auth.module';
import { TestingModule } from './app/testing/testing.module';
import { HealthModule } from './app/health/health.module';
import { OrganizationModule } from './app/organization/organization.module';
import { EnvironmentsModule } from './app/environments/environments.module';
import { ExecutionDetailsModule } from './app/execution-details/execution-details.module';
import { WorkflowModule } from './app/workflows/workflow.module';
import { EventsModule } from './app/events/events.module';
import { WidgetsModule } from './app/widgets/widgets.module';
import { NotificationModule } from './app/notifications/notification.module';
import { StorageModule } from './app/storage/storage.module';
import { NotificationGroupsModule } from './app/notification-groups/notification-groups.module';
import { InvitesModule } from './app/invites/invites.module';
import { ContentTemplatesModule } from './app/content-templates/content-templates.module';
import { IntegrationModule } from './app/integrations/integrations.module';
import { ChangeModule } from './app/change/change.module';
import { SubscribersModule } from './app/subscribers/subscribers.module';
import { FeedsModule } from './app/feeds/feeds.module';
import { LayoutsModule } from './app/layouts/layouts.module';
import { MessagesModule } from './app/messages/messages.module';
import { PartnerIntegrationsModule } from './app/partner-integrations/partner-integrations.module';
import { TopicsModule } from './app/topics/topics.module';
import { InboundParseModule } from './app/inbound-parse/inbound-parse.module';
import { BlueprintModule } from './app/blueprint/blueprint.module';
import { TenantModule } from './app/tenant/tenant.module';
import { IdempotencyInterceptor } from './app/shared/framework/idempotency.interceptor';
import { WorkflowOverridesModule } from './app/workflow-overrides/workflow-overrides.module';
import { ApiRateLimitInterceptor } from './app/rate-limiting/guards';
import { RateLimitingModule } from './app/rate-limiting/rate-limiting.module';
import { ProductFeatureInterceptor } from './app/shared/interceptors/product-feature.interceptor';
import { AnalyticsModule } from './app/analytics/analytics.module';
import { InboxModule } from './app/inbox/inbox.module';
import { BridgeModule } from './app/bridge/bridge.module';
import { PreferencesModule } from './app/preferences';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    if (require('@novu/ee-translation')?.EnterpriseTranslationModule) {
      modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModule);
    }
    if (require('@novu/ee-billing')?.BillingModule) {
      modules.push(require('@novu/ee-billing')?.BillingModule.forRoot());
    }
  }

  return modules;
};

const enterpriseQuotaThrottlerInterceptor =
  (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') &&
  require('@novu/ee-billing')?.QuotaThrottlerInterceptor
    ? [
        {
          provide: APP_INTERCEPTOR,
          useClass: require('@novu/ee-billing')?.QuotaThrottlerInterceptor,
        },
      ]
    : [];

const baseModules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  AuthModule,
  InboundParseModule,
  SharedModule,
  HealthModule,
  EnvironmentsModule,
  ExecutionDetailsModule,
  WorkflowModule,
  EventsModule,
  WidgetsModule,
  InboxModule,
  NotificationModule,
  NotificationGroupsModule,
  ContentTemplatesModule,
  OrganizationModule,
  UserModule,
  IntegrationModule,
  ChangeModule,
  SubscribersModule,
  FeedsModule,
  LayoutsModule,
  MessagesModule,
  PartnerIntegrationsModule,
  TopicsModule,
  BlueprintModule,
  TenantModule,
  StorageModule,
  WorkflowOverridesModule,
  RateLimitingModule,
  WidgetsModule,
  ProfilingModule.register(packageJson.name),
  TracingModule.register(packageJson.name, packageJson.version),
  BridgeModule,
  PreferencesModule,
];

const enterpriseModules = enterpriseImports();

if (!isClerkEnabled()) {
  const communityModules = [InvitesModule];
  baseModules.push(...communityModules);
}

const modules = baseModules.concat(enterpriseModules);

const providers: Provider[] = [
  {
    provide: APP_INTERCEPTOR,
    useClass: ApiRateLimitInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ProductFeatureInterceptor,
  },
  ...enterpriseQuotaThrottlerInterceptor,
  {
    provide: APP_INTERCEPTOR,
    useClass: IdempotencyInterceptor,
  },
];

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

if (process.env.SEGMENT_TOKEN) {
  modules.push(AnalyticsModule);
}

if (process.env.NODE_ENV === 'test') {
  modules.push(TestingModule);
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

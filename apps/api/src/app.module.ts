/* eslint-disable global-require */
import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TracingModule } from '@novu/application-generic';
import { Client, NovuModule } from '@novu/framework/nest';

import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { isClerkEnabled } from '@novu/shared';
import { SentryModule } from '@sentry/nestjs/setup';
import { ApiExcludeController } from '@nestjs/swagger';
import { usageLimitsWorkflow } from '@novu/notifications';
import packageJson from '../package.json';
import { SharedModule } from './app/shared/shared.module';
import { UserModule } from './app/user/user.module';
import { AuthModule } from './app/auth/auth.module';
import { TestingModule } from './app/testing/testing.module';
import { HealthModule } from './app/health/health.module';
import { OrganizationModule } from './app/organization/organization.module';
import { ExecutionDetailsModule } from './app/execution-details/execution-details.module';
import { EventsModule } from './app/events/events.module';
import { WidgetsModule } from './app/widgets/widgets.module';
import { NotificationModule } from './app/notifications/notification.module';
import { StorageModule } from './app/storage/storage.module';
import { NotificationGroupsModule } from './app/notification-groups/notification-groups.module';
import { InvitesModule } from './app/invites/invites.module';
import { ContentTemplatesModule } from './app/content-templates/content-templates.module';
import { IntegrationModule } from './app/integrations/integrations.module';
import { ChangeModule } from './app/change/change.module';
import { SubscribersV1Module } from './app/subscribers/subscribersV1.module';
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
import { WorkflowModule } from './app/workflows-v2/workflow.module';
import { WorkflowModuleV1 } from './app/workflows-v1/workflow-v1.module';
import { EnvironmentsModuleV1 } from './app/environments-v1/environments-v1.module';
import { EnvironmentsModule } from './app/environments-v2/environments.module';
import { SubscribersModule } from './app/subscribers-v2/subscribers.module';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    if (require('@novu/ee-translation')?.EnterpriseTranslationModule) {
      modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModule);
    }
    if (require('@novu/ee-billing')?.BillingModule) {
      modules.push(require('@novu/ee-billing')?.BillingModule.forRoot());
    }
    if (require('./app/support/support.module')?.SupportModule) {
      modules.push(require('./app/support/support.module')?.SupportModule);
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
  EnvironmentsModuleV1,
  ExecutionDetailsModule,
  WorkflowModuleV1,
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
  SubscribersV1Module,
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
  TracingModule.register(packageJson.name, packageJson.version),
  BridgeModule,
  PreferencesModule,
  WorkflowModule,
  EnvironmentsModule,
  NovuModule,
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
  modules.unshift(SentryModule.forRoot());
}

if (process.env.SEGMENT_TOKEN) {
  modules.push(AnalyticsModule);
}

if (process.env.NODE_ENV === 'test') {
  modules.push(TestingModule);
}

modules.push(
  NovuModule.register({
    apiPath: '/bridge/novu',
    client: new Client({
      secretKey: process.env.NOVU_INTERNAL_SECRET_KEY,
      strictAuthentication:
        process.env.NODE_ENV === 'production' ||
        process.env.NODE_ENV === 'dev' ||
        process.env.NOVU_STRICT_AUTHENTICATION_ENABLED === 'true',
    }),
    controllerDecorators: [ApiExcludeController()],
    workflows: [usageLimitsWorkflow],
  })
);

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

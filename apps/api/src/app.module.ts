/* eslint-disable global-require */
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { cacheService, TracingModule } from '@novu/application-generic';
import { Client, NovuModule } from '@novu/framework/nest';

import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ApiExcludeController } from '@nestjs/swagger';
import { usageLimitsWorkflow } from '@novu/notifications';
import { isClerkEnabled } from '@novu/shared';
import { SentryModule } from '@sentry/nestjs/setup';
import packageJson from '../package.json';
import { AnalyticsModule } from './app/analytics/analytics.module';
import { AuthModule } from './app/auth/auth.module';
import { BlueprintModule } from './app/blueprint/blueprint.module';
import { BridgeModule } from './app/bridge/bridge.module';
import { ChangeModule } from './app/change/change.module';
import { ContentTemplatesModule } from './app/content-templates/content-templates.module';
import { EnvironmentsModuleV1 } from './app/environments-v1/environments-v1.module';
import { EnvironmentsModule } from './app/environments-v2/environments.module';
import { EventsModule } from './app/events/events.module';
import { ExecutionDetailsModule } from './app/execution-details/execution-details.module';
import { FeedsModule } from './app/feeds/feeds.module';
import { HealthModule } from './app/health/health.module';
import { InboundParseModule } from './app/inbound-parse/inbound-parse.module';
import { InboxModule } from './app/inbox/inbox.module';
import { IntegrationModule } from './app/integrations/integrations.module';
import { InternalModule } from './app/internal/internal.module';
import { InvitesModule } from './app/invites/invites.module';
import { LayoutsV1Module } from './app/layouts-v1/layouts-v1.module';
import { LayoutsV2Module } from './app/layouts-v2/layouts.module';
import { MessagesModule } from './app/messages/messages.module';
import { NotificationGroupsModule } from './app/notification-groups/notification-groups.module';
import { NotificationModule } from './app/notifications/notification.module';
import { OrganizationModule } from './app/organization/organization.module';
import { LogsModule } from './app/logs/logs.module';
import { PartnerIntegrationsModule } from './app/partner-integrations/partner-integrations.module';
import { PreferencesModule } from './app/preferences';
import { ApiRateLimitInterceptor } from './app/rate-limiting/guards';
import { RateLimitingModule } from './app/rate-limiting/rate-limiting.module';
import { IdempotencyInterceptor } from './app/shared/framework/idempotency.interceptor';
import { ProductFeatureInterceptor } from './app/shared/interceptors/product-feature.interceptor';
import { SharedModule } from './app/shared/shared.module';
import { StorageModule } from './app/storage/storage.module';
import { SubscribersModule } from './app/subscribers-v2/subscribers.module';
import { SubscribersV1Module } from './app/subscribers/subscribersV1.module';
import { SupportModule } from './app/support/support.module';
import { WebhooksModule } from './app/webhooks/webhooks.module';
import { TenantModule } from './app/tenant/tenant.module';
import { TestingModule } from './app/testing/testing.module';
import { TopicsV1Module } from './app/topics-v1/topics-v1.module';
import { TopicsV2Module } from './app/topics-v2/topics-v2.module';
import { UserModule } from './app/user/user.module';
import { WidgetsModule } from './app/widgets/widgets.module';
import { WorkflowOverridesModule } from './app/workflow-overrides/workflow-overrides.module';
import { WorkflowModuleV1 } from './app/workflows-v1/workflow-v1.module';
import { WorkflowModule } from './app/workflows-v2/workflow.module';
import { AnalyticsLogsInterceptor } from './app/shared/framework/analytics-logs.interceptor';
import { AnalyticsLogsGuard } from './app/shared/framework/analytics-logs.guard';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    if (require('@novu/ee-translation')?.EnterpriseTranslationModule) {
      modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModule);
      modules.push(require('@novu/ee-translation')?.TranslationModule);
    }

    if (require('@novu/ee-billing')?.BillingModule) {
      modules.push(require('@novu/ee-billing')?.BillingModule.forRoot());
    }
    modules.push(SupportModule);
    modules.push(WebhooksModule);
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
  LogsModule,
  UserModule,
  IntegrationModule,
  InternalModule,
  ChangeModule,
  SubscribersV1Module,
  SubscribersModule,
  FeedsModule,
  LayoutsV1Module,
  LayoutsV2Module,
  MessagesModule,
  PartnerIntegrationsModule,
  TopicsV1Module,
  TopicsV2Module,
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
    provide: APP_GUARD,
    useClass: AnalyticsLogsGuard,
  },
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
  {
    provide: APP_INTERCEPTOR,
    useClass: AnalyticsLogsInterceptor,
  },
  cacheService,
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
export class AppModule {}

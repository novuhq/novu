/* eslint-disable global-require */ import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GracefulShutdownConfigModule, ProfilingModule, TracingModule } from '@novu/application-generic';
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
import { InvitesModule } from './app/invites/invites.module';
import { LayoutsModule } from './app/layouts/layouts.module';
import { MessagesModule } from './app/messages/messages.module';
import { NotificationGroupsModule } from './app/notification-groups/notification-groups.module';
import { NotificationModule } from './app/notifications/notification.module';
import { OrganizationModule } from './app/organization/organization.module';
import { PartnerIntegrationsModule } from './app/partner-integrations/partner-integrations.module';
import { PreferencesModule } from './app/preferences';
import { ApiRateLimitInterceptor } from './app/rate-limiting/guards';
import { RateLimitingModule } from './app/rate-limiting/rate-limiting.module';
import { IdempotencyInterceptor } from './app/shared/framework/idempotency.interceptor';
import { ProductFeatureInterceptor } from './app/shared/interceptors/product-feature.interceptor';
import { SharedModule } from './app/shared/shared.module';
import { StepSchemasModule } from './app/step-schemas/step-schemas.module';
import { StorageModule } from './app/storage/storage.module';
import { SubscribersModule } from './app/subscribers/subscribers.module';
import { TenantModule } from './app/tenant/tenant.module';
import { TestingModule } from './app/testing/testing.module';
import { TopicsModule } from './app/topics/topics.module';
import { UserModule } from './app/user/user.module';
import { WidgetsModule } from './app/widgets/widgets.module';
import { WorkflowOverridesModule } from './app/workflow-overrides/workflow-overrides.module';
import { WorkflowModuleV1 } from './app/workflows-v1/workflow-v1.module';
import { WorkflowModule } from './app/workflows-v2/workflow.module';

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
  StepSchemasModule,
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
  WorkflowModule,
  GracefulShutdownConfigModule.forRootAsync(),
  EnvironmentsModule,
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

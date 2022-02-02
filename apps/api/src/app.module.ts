import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { RavenInterceptor, RavenModule } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { SharedModule } from './app/shared/shared.module';
import { UserModule } from './app/user/user.module';
import { AuthModule } from './app/auth/auth.module';
import { TestingModule } from './app/testing/testing.module';
import { HealthModule } from './app/health/health.module';
import { AdminModule } from './app/admin/admin.module';
import { OrganizationModule } from './app/organization/organization.module';
import { ApplicationsModule } from './app/applications/applications.module';
import { NotificationTemplateModule } from './app/notification-template/notification-template.module';
import { EventsModule } from './app/events/events.module';
import { WidgetsModule } from './app/widgets/widgets.module';
import { ActivityModule } from './app/activity/activity.module';
import { ChannelsModule } from './app/channels/channels.module';
import { StorageModule } from './app/storage/storage.module';
import { NotificationGroupsModule } from './app/notification-groups/notification-groups.module';
import { InvitesModule } from './app/invites/invites.module';
import { ContentTemplatesModule } from './app/content-templates/content-templates.module';
import { QueueService } from './app/shared/services/queue';

const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  OrganizationModule,
  SharedModule,
  UserModule,
  AuthModule,
  HealthModule,
  AdminModule,
  ApplicationsModule,
  NotificationTemplateModule,
  EventsModule,
  WidgetsModule,
  ActivityModule,
  ChannelsModule,
  StorageModule,
  NotificationGroupsModule,
  InvitesModule,
  ContentTemplatesModule,
];

const providers = [];

if (process.env.SENTRY_DSN) {
  modules.push(RavenModule);
  providers.push({
    provide: APP_INTERCEPTOR,
    useValue: new RavenInterceptor({
      user: ['_id', 'firstName', 'email', 'organizationId', 'applicationId'],
    }),
  });
}

if (process.env.NODE_ENV === 'test') {
  modules.push(TestingModule);
}

@Module({
  imports: modules,
  controllers: [],
  providers,
})
export class AppModule implements OnModuleInit {
  constructor(private queueService: QueueService) {}

  async onModuleInit() {
    //
  }
}

import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnvironmentsModule } from '../environments/environments.module';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { OrganizationController } from './organization.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, UserModule, EnvironmentsModule],
  controllers: [OrganizationController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class OrganizationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {
    consumer.apply(AuthGuard).exclude({
      method: RequestMethod.GET,
      path: '/organizations/invite/:inviteToken',
    });
  }
}

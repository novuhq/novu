import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@Controller('/test-auth')
@ApiExcludeController()
export class TestApiAuthController {
  @ExternalApiAccessible()
  @UserAuthentication()
  @Get('/user-route')
  userRoute(@UserSession() user: UserSessionData) {
    return user;
  }

  @UserAuthentication()
  @Get('/user-api-inaccessible-route')
  userInaccessibleRoute() {
    return true;
  }
}

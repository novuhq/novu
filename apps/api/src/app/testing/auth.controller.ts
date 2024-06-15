import { Controller, Get } from '@nestjs/common';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@Controller('/test-auth')
export class TestApiAuthController {
  @ExternalApiAccessible()
  @UserAuthentication()
  @Get('/user-route')
  userRoute() {
    return true;
  }

  @UserAuthentication()
  @Get('/user-api-inaccessible-route')
  userInaccessibleRoute() {
    return true;
  }
}

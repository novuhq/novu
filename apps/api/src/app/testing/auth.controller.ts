import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { RequireAuthentication } from '../auth/framework/auth.decorator';

@Controller('/test-auth')
@RequireAuthentication()
@ApiExcludeController()
export class TestApiAuthController {
  @ExternalApiAccessible()
  @Get('/user-route')
  userRoute() {
    return true;
  }

  @Get('/user-api-inaccessible-route')
  userInaccessibleRoute() {
    return true;
  }
}

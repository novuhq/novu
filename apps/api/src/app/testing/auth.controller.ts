import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';

@Controller('/test-auth')
export class TestApiAuthController {
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @Get('/user-route')
  userRoute() {
    return true;
  }

  @UseGuards(UserAuthGuard)
  @Get('/user-api-inaccessible-route')
  userInaccessibleRoute() {
    return true;
  }
}

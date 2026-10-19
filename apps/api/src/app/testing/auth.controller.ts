import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequirePermissions, SkipPermissionsCheck } from '@novu/application-generic';
import { PermissionsEnum } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';

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

  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE, PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  @Get('/permission-route')
  permissionRoute() {
    return true;
  }

  @SkipPermissionsCheck()
  @Get('/no-permission-route')
  noPermissionRoute() {
    return true;
  }

  @Get('/all-permissions-route')
  allPermissionsRoute() {
    return true;
  }
}

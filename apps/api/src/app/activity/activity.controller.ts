import { ClassSerializerInterceptor, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ExternalApiAccessible, RequirePermissions, UserSession } from '@novu/application-generic';
import { PermissionsEnum } from '@novu/shared';
import { GetRequests } from './usecases/get-requests/get-requests.usecase';
import { GetRequestsCommand } from './usecases/get-requests/get-requests.command';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetRequestsDto } from './dtos/get-requests.dto';
import { GetRequestsResponseDto } from './dtos/get-requests.response.dto';

@Controller('/activity')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
export class ActivityController {
  constructor(private getRequestsUsecase: GetRequests) {}

  @Get('requests')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  @ExternalApiAccessible()
  async getLogs(
    @UserSession() user,
    @Query()
    query: GetRequestsDto
  ): Promise<GetRequestsResponseDto> {
    return this.getRequestsUsecase.execute(
      GetRequestsCommand.create({
        ...query,
        organizationId: user.organizationId,
        userId: user._id,
        createdGte: query.createdGte,
      })
    );
  }
}

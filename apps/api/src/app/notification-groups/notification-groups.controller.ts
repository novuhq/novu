import { Body, ClassSerializerInterceptor, Controller, Get, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { CreateNotificationGroup } from './usecases/create-notification-group/create-notification-group.usecase';
import { Roles } from '../auth/framework/roles.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateNotificationGroupCommand } from './usecases/create-notification-group/create-notification-group.command';
import { CreateNotificationGroupRequestDto } from './dtos/create-notification-group-request.dto';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { GetNotificationGroups } from './usecases/get-notification-groups/get-notification-groups.usecase';
import { GetNotificationGroupsCommand } from './usecases/get-notification-groups/get-notification-groups.command';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationGroupResponseDto } from './dtos/notification-group-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiResponse } from '../shared/framework/response.decorator';

@Controller('/notification-groups')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Notification groups')
export class NotificationGroupsController {
  constructor(
    private createNotificationGroupUsecase: CreateNotificationGroup,
    private getNotificationGroupsUsecase: GetNotificationGroups
  ) {}

  @Post('')
  @ExternalApiAccessible()
  @ApiResponse(NotificationGroupResponseDto, 201)
  @ApiOperation({
    summary: 'Create notification group',
  })
  createNotificationGroup(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateNotificationGroupRequestDto
  ): Promise<NotificationGroupResponseDto> {
    return this.createNotificationGroupUsecase.execute(
      CreateNotificationGroupCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
      })
    );
  }

  @Get('')
  @ExternalApiAccessible()
  @ApiResponse(NotificationGroupResponseDto, 200, true)
  @ApiOperation({
    summary: 'Get notification groups',
  })
  getNotificationGroups(@UserSession() user: IJwtPayload): Promise<NotificationGroupResponseDto[]> {
    return this.getNotificationGroupsUsecase.execute(
      GetNotificationGroupsCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
      })
    );
  }
}

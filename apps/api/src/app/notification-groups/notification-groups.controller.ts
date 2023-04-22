import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { CreateNotificationGroup } from './usecases/create-notification-group/create-notification-group.usecase';
import { Roles } from '../auth/framework/roles.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateNotificationGroupCommand } from './usecases/create-notification-group/create-notification-group.command';
import { CreateNotificationGroupRequestDto } from './dtos/create-notification-group-request.dto';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { GetNotificationGroups } from './usecases/get-notification-groups/get-notification-groups.usecase';
import { GetNotificationGroupsCommand } from './usecases/get-notification-groups/get-notification-groups.command';
import { ApiCreatedResponse, ApiExcludeController, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationGroupResponseDto } from './dtos/notification-group-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetNotificationGroup } from './usecases/get-notification-group/get-notification-group.usecase';
import { GetNotificationGroupCommand } from './usecases/get-notification-group/get-notification-group.command';
import { DeleteNotificationGroup } from './usecases/delete-notification-group/delete-notification-group.usecase';
import { DeleteNotificationGroupCommand } from './usecases/delete-notification-group/delete-notification-group.command';
import { DeleteNotificationGroupResponseDto } from './dtos/delete-notification-group-response.dto';

@Controller('/notification-groups')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Notification groups')
export class NotificationGroupsController {
  constructor(
    private createNotificationGroupUsecase: CreateNotificationGroup,
    private getNotificationGroupsUsecase: GetNotificationGroups,
    private getNotificationGroupUsecase: GetNotificationGroup,
    private deleteNotificationGroupUsecase: DeleteNotificationGroup
  ) {}

  @Post('')
  @ExternalApiAccessible()
  @ApiCreatedResponse({
    type: NotificationGroupResponseDto,
  })
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
  @ApiOkResponse({
    type: [NotificationGroupResponseDto],
  })
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

  @Get('/:id')
  @ExternalApiAccessible()
  @ApiOkResponse({
    type: [NotificationGroupResponseDto],
  })
  @ApiOperation({
    summary: 'Get notification group',
  })
  getNotificationGroup(
    @UserSession() user: IJwtPayload,
    @Param('id') id: string
  ): Promise<NotificationGroupResponseDto> {
    return this.getNotificationGroupUsecase.execute(
      GetNotificationGroupCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        id,
      })
    );
  }

  @Delete('/:id')
  @ExternalApiAccessible()
  @ApiOkResponse({
    type: DeleteNotificationGroupResponseDto,
  })
  @ApiOperation({
    summary: 'Delete notification group',
  })
  deleteNotificationGroup(
    @UserSession() user: IJwtPayload,
    @Param('id') id: string
  ): Promise<DeleteNotificationGroupResponseDto> {
    return this.deleteNotificationGroupUsecase.execute(
      DeleteNotificationGroupCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        id,
      })
    );
  }
}

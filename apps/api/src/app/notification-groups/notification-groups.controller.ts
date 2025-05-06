import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateNotificationGroup } from './usecases/create-notification-group/create-notification-group.usecase';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateNotificationGroupCommand } from './usecases/create-notification-group/create-notification-group.command';
import { CreateNotificationGroupRequestDto } from './dtos/create-notification-group-request.dto';
import { GetNotificationGroups } from './usecases/get-notification-groups/get-notification-groups.usecase';
import { GetNotificationGroupsCommand } from './usecases/get-notification-groups/get-notification-groups.command';
import { NotificationGroupResponseDto } from './dtos/notification-group-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetNotificationGroup } from './usecases/get-notification-group/get-notification-group.usecase';
import { GetNotificationGroupCommand } from './usecases/get-notification-group/get-notification-group.command';
import { DeleteNotificationGroup } from './usecases/delete-notification-group/delete-notification-group.usecase';
import { DeleteNotificationGroupCommand } from './usecases/delete-notification-group/delete-notification-group.command';
import { DeleteNotificationGroupResponseDto } from './dtos/delete-notification-group-response.dto';
import { UpdateNotificationGroupCommand } from './usecases/update-notification-group/update-notification-group.command';
import { UpdateNotificationGroup } from './usecases/update-notification-group/update-notification-group.usecase';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@ApiCommonResponses()
@Controller('/notification-groups')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Workflow groups')
@ApiExcludeController()
export class NotificationGroupsController {
  constructor(
    private createNotificationGroupUsecase: CreateNotificationGroup,
    private getNotificationGroupsUsecase: GetNotificationGroups,
    private getNotificationGroupUsecase: GetNotificationGroup,
    private deleteNotificationGroupUsecase: DeleteNotificationGroup,
    private updateNotificationGroupUsecase: UpdateNotificationGroup
  ) {}

  @Post('')
  @ExternalApiAccessible()
  @ApiResponse(NotificationGroupResponseDto, 201)
  @ApiOperation({
    summary: 'Create workflow group',
    description: `workflow group was previously named notification group`,
  })
  createNotificationGroup(
    @UserSession() user: UserSessionData,
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
    summary: 'Get workflow groups',
    description: `workflow group was previously named notification group`,
  })
  listNotificationGroups(@UserSession() user: UserSessionData): Promise<NotificationGroupResponseDto[]> {
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
  @ApiResponse(NotificationGroupResponseDto, 200)
  @ApiOperation({
    summary: 'Get workflow group',
    description: `workflow group was previously named notification group`,
  })
  getNotificationGroup(
    @UserSession() user: UserSessionData,
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

  @Patch('/:id')
  @ExternalApiAccessible()
  @ApiResponse(NotificationGroupResponseDto, 200)
  @ApiOperation({
    summary: 'Update workflow group',
    description: `workflow group was previously named notification group`,
  })
  updateNotificationGroup(
    @UserSession() user: UserSessionData,
    @Param('id') id: string,
    @Body() body: CreateNotificationGroupRequestDto
  ): Promise<NotificationGroupResponseDto> {
    return this.updateNotificationGroupUsecase.execute(
      UpdateNotificationGroupCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
        id,
      })
    );
  }

  @Delete('/:id')
  @ExternalApiAccessible()
  @ApiResponse(DeleteNotificationGroupResponseDto, 200)
  @ApiOperation({
    summary: 'Delete workflow group',
    description: `workflow group was previously named notification group`,
  })
  deleteNotificationGroup(
    @UserSession() user: UserSessionData,
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

import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { CreateNotificationGroup } from './usecases/create-notification-group/create-notification-group.usecase';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateNotificationGroupCommand } from './usecases/create-notification-group/create-notification-group.command';
import { CreateNotificationGroupRequestDto } from './dtos/create-notification-group-request.dto';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { GetNotificationGroups } from './usecases/get-notification-groups/get-notification-groups.usecase';
import { GetNotificationGroupsCommand } from './usecases/get-notification-groups/get-notification-groups.command';
import { ApiCreatedResponse, ApiExcludeController, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationGroupResponseDto } from './dtos/notification-group-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { DeleteNotificationGroup } from './usecases/delete-notification-group/delete-notification-group.usecase';
import { DeleteNotificationGroupCommand } from './usecases/delete-notification-group/delete-notification-group.command';
import { DeleteNotificationGroupResponseDto } from './dtos/delete-notification-group-response.dto';
import { UpdateNotificationGroupCommand } from './usecases/update-notification-group/update-notification-group.command';
import { UpdateNotificationGroup } from './usecases/update-notification-group/update-notification-group.usecase';
import { GetNotificationGroup } from './usecases/get-notification-group/get-notification-group.usecase';
import { GetNotificationGroupCommand } from './usecases/get-notification-group/get-notification-group.command';

@Controller('/notification-groups')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Notification groups')
export class NotificationGroupsController {
  constructor(
    private createNotificationGroupUsecase: CreateNotificationGroup,
    private getNotificationGroupsUsecase: GetNotificationGroups,
    private getNotificationGroupUsecase: GetNotificationGroup,
    private deleteNotificationGroupsUsecase: DeleteNotificationGroup,
    private updateNotificationGroupsUsecase: UpdateNotificationGroup
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

  @Put('/:id')
  @ExternalApiAccessible()
  @ApiCreatedResponse({
    type: NotificationGroupResponseDto,
  })
  @ApiOperation({
    summary: 'Update notification group',
  })
  updateNotificationGroup(
    @UserSession() user: IJwtPayload,
    @Param('id') id: string,
    @Body() body: CreateNotificationGroupRequestDto
  ): Promise<NotificationGroupResponseDto> {
    return this.updateNotificationGroupsUsecase.execute(
      UpdateNotificationGroupCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
        id,
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
    summary: 'Get notification groups',
  })
  getNotificationGroup(
    @UserSession() user: IJwtPayload,
    @Param('id') id: string
  ): Promise<NotificationGroupResponseDto> {
    return this.getNotificationGroupUsecase.execute(
      GetNotificationGroupCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
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
    summary: 'Delete notification groups',
  })
  deleteNotificationGroups(
    @UserSession() user: IJwtPayload,
    @Param('id') id: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return this.deleteNotificationGroupsUsecase.execute(
      DeleteNotificationGroupCommand.create({
        id,
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
      })
    );
  }
}

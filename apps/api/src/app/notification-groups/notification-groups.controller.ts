import { Body, ClassSerializerInterceptor, Controller, Get, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { CreateNotificationGroup } from './usecases/create-notification-group/create-notification-group.usecase';
import { Roles } from '../auth/framework/roles.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateNotificationGroupCommand } from './usecases/create-notification-group/create-notification-group.command';
import { CreateNotificationGroupDto } from './dto/create-notification-group.dto';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { GetNotificationGroups } from './usecases/get-notification-groups/get-notification-groups.usecase';
import { GetNotificationGroupsCommand } from './usecases/get-notification-groups/get-notification-groups.command';
import { ApiTags } from '@nestjs/swagger';

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
  @Roles(MemberRoleEnum.ADMIN)
  createNotificationGroup(@UserSession() user: IJwtPayload, @Body() body: CreateNotificationGroupDto) {
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
  @Roles(MemberRoleEnum.ADMIN)
  getNotificationGroups(@UserSession() user: IJwtPayload) {
    return this.getNotificationGroupsUsecase.execute(
      GetNotificationGroupsCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
      })
    );
  }
}

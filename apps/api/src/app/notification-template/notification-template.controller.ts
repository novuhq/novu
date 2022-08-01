import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { Roles } from '../auth/framework/roles.decorator';
import { GetNotificationTemplates } from './usecases/get-notification-templates/get-notification-templates.usecase';
import { GetNotificationTemplatesCommand } from './usecases/get-notification-templates/get-notification-templates.command';
import { CreateNotificationTemplate, CreateNotificationTemplateCommand } from './usecases/create-notification-template';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto, ChangeTemplateStatusDto } from './dto';
import { GetNotificationTemplate } from './usecases/get-notification-template/get-notification-template.usecase';
import { GetNotificationTemplateCommand } from './usecases/get-notification-template/get-notification-template.command';
import { UpdateNotificationTemplate } from './usecases/update-notification-template/update-notification-template.usecase';
import { DeleteNotificationTemplate } from './usecases/delete-notification-template/delete-notification-template.usecase';
import { UpdateNotificationTemplateCommand } from './usecases/update-notification-template/update-notification-template.command';
import { ChangeTemplateActiveStatus } from './usecases/change-template-active-status/change-template-active-status.usecase';
import { ChangeTemplateActiveStatusCommand } from './usecases/change-template-active-status/change-template-active-status.command';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';

@Controller('/notification-templates')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class NotificationTemplateController {
  constructor(
    private getNotificationTemplatesUsecase: GetNotificationTemplates,
    private createNotificationTemplateUsecase: CreateNotificationTemplate,
    private getNotificationTemplateUsecase: GetNotificationTemplate,
    private updateTemplateByIdUsecase: UpdateNotificationTemplate,
    private deleteTemplateByIdUsecase: DeleteNotificationTemplate,
    private changeTemplateActiveStatusUsecase: ChangeTemplateActiveStatus
  ) {}

  @Get('')
  @Roles(MemberRoleEnum.ADMIN)
  getNotificationTemplates(@UserSession() user: IJwtPayload) {
    return this.getNotificationTemplatesUsecase.execute(
      GetNotificationTemplatesCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
      })
    );
  }

  @Put('/:templateId')
  @Roles(MemberRoleEnum.ADMIN)
  async updateTemplateById(
    @UserSession() user: IJwtPayload,
    @Param('templateId') templateId: string,
    @Body() body: UpdateNotificationTemplateDto
  ) {
    return await this.updateTemplateByIdUsecase.execute(
      UpdateNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        critical: body.critical,
        steps: body.steps,
        notificationGroupId: body.notificationGroupId,
      })
    );
  }

  @Delete('/:templateId')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  deleteTemplateById(@UserSession() user: IJwtPayload, @Param('templateId') templateId: string) {
    return this.deleteTemplateByIdUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
      })
    );
  }

  @Get('/:templateId')
  @Roles(MemberRoleEnum.ADMIN)
  getNotificationTemplateById(@UserSession() user: IJwtPayload, @Param('templateId') templateId: string) {
    return this.getNotificationTemplateUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
      })
    );
  }

  @Post('')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  createNotificationTemplates(@UserSession() user: IJwtPayload, @Body() body: CreateNotificationTemplateDto) {
    return this.createNotificationTemplateUsecase.execute(
      CreateNotificationTemplateCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        steps: body.steps,
        notificationGroupId: body.notificationGroupId,
        active: body.active ?? false,
        draft: body.draft ?? true,
        critical: body.critical ?? false,
      })
    );
  }

  @Put('/:templateId/status')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  changeActiveStatus(
    @UserSession() user: IJwtPayload,
    @Body() body: ChangeTemplateStatusDto,
    @Param('templateId') templateId: string
  ) {
    return this.changeTemplateActiveStatusUsecase.execute(
      ChangeTemplateActiveStatusCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        active: body.active,
        templateId,
      })
    );
  }
}

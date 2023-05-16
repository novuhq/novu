import { ClassSerializerInterceptor, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';

import { IJwtPayload } from '@novu/shared';

import { UserSession } from '../shared/framework/user.decorator';
import { NotificationTemplateResponse } from '../notification-template/dto/notification-template-response.dto';
import {
  GetBlueprintNotificationTemplate,
  GetBlueprintNotificationTemplateCommand,
} from './usecases/get-blueprint-notification-template';
import { CreateBlueprintNotificationTemplate } from './usecases/create-blueprint-notification-template';

@Controller('/blueprints')
@UseInterceptors(ClassSerializerInterceptor)
export class BlueprintController {
  constructor(
    private getBlueprintNotificationTemplate: GetBlueprintNotificationTemplate,
    private createBlueprintNotificationTemplate: CreateBlueprintNotificationTemplate
  ) {}

  @Get('/:templateId')
  getNotificationTemplateBlueprintById(
    @UserSession() user: IJwtPayload,
    @Param('templateId') templateId: string
  ): Promise<NotificationTemplateResponse> {
    return this.getBlueprintNotificationTemplate.execute(
      GetBlueprintNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
      })
    );
  }

  @Post('/:templateId/blueprint')
  createNotificationTemplateFromBlueprintById(
    @UserSession() user: IJwtPayload,
    @Param('templateId') templateId: string
  ): Promise<NotificationTemplateResponse> {
    return this.createBlueprintNotificationTemplate.execute(
      GetBlueprintNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
      })
    );
  }
}

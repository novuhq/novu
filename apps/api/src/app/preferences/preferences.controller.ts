import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { UserSessionData } from '@novu/shared';
import {
  GetPreferences,
  GetPreferencesCommand,
  UpsertPreferences,
  UpsertPreferencesCommand,
  UserAuthGuard,
  UserSession,
} from '@novu/application-generic';

import { ApiExcludeController } from '@nestjs/swagger';

@Controller('/preferences')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
export class PreferencesController {
  constructor(private upsertPreferences: UpsertPreferences, private getPreferences: GetPreferences) {}

  @Get('/')
  @UseGuards(UserAuthGuard)
  async get(@UserSession() user: UserSessionData, @Query('workflowId') workflowId: string) {
    return this.getPreferences.execute(
      GetPreferencesCommand.create({
        templateId: workflowId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
      })
    );
  }

  @Post('/')
  @UseGuards(UserAuthGuard)
  async preview(
    @Body()
    data: {
      workflowId: string;
      preferences: UpsertPreferencesCommand['preferences'];
    },
    @UserSession() user: UserSessionData
  ) {
    return this.upsertPreferences.execute(
      UpsertPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        preferences: data.preferences,
        templateId: data.workflowId,
      })
    );
  }
}

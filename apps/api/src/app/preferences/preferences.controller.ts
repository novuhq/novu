import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  GetFeatureFlag,
  GetPreferences,
  GetPreferencesCommand,
  UpsertPreferences,
  UpsertUserWorkflowPreferencesCommand,
  UserAuthGuard,
  UserSession,
} from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { ApiExcludeController } from '@nestjs/swagger';
import { UpsertPreferencesDto } from './dtos/upsert-preferences.dto';

@Controller('/preferences')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
export class PreferencesController {
  constructor(
    private upsertPreferences: UpsertPreferences,
    private getPreferences: GetPreferences,
    private getFeatureFlag: GetFeatureFlag
  ) {}

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
  async upsert(@Body() data: UpsertPreferencesDto, @UserSession() user: UserSessionData) {
    return this.upsertPreferences.upsertUserWorkflowPreferences(
      UpsertUserWorkflowPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        preferences: data.preferences,
        templateId: data.workflowId,
      })
    );
  }

  @Delete('/')
  @UseGuards(UserAuthGuard)
  async delete(@UserSession() user: UserSessionData, @Query('workflowId') workflowId: string) {
    return this.upsertPreferences.upsertUserWorkflowPreferences(
      UpsertUserWorkflowPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId: workflowId,
        preferences: null,
      })
    );
  }
}

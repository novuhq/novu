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
  DeletePreferencesCommand,
  DeletePreferencesUseCase,
  GetPreferences,
  GetPreferencesCommand,
  UpsertPreferences,
  UpsertUserWorkflowPreferencesCommand,
  UserSession,
} from '@novu/application-generic';
import { PreferencesTypeEnum, UserSessionData } from '@novu/shared';
import { ApiExcludeController } from '@nestjs/swagger';
import { UpsertPreferencesDto } from './dtos/upsert-preferences.dto';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

/**
 * @deprecated - set workflow preferences using the `/workflows` endpoint instead
 */
@Controller('/preferences')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiExcludeController()
export class PreferencesController {
  constructor(
    private upsertPreferences: UpsertPreferences,
    private getPreferences: GetPreferences,
    private deletePreferences: DeletePreferencesUseCase
  ) {}

  @Get('/')
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
  async delete(@UserSession() user: UserSessionData, @Query('workflowId') workflowId: string) {
    return this.deletePreferences.execute(
      DeletePreferencesCommand.create({
        templateId: workflowId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        type: PreferencesTypeEnum.USER_WORKFLOW,
      })
    );
  }
}

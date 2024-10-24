import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  GetFeatureFlag,
  GetFeatureFlagCommand,
  GetPreferences,
  GetPreferencesCommand,
  UpsertPreferences,
  UpsertPreferencesCommand,
  UserAuthGuard,
  UserSession,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum, PreferencesTypeEnum, UserSessionData } from '@novu/shared';
import { ApiExcludeController } from '@nestjs/swagger';
import { UpsertPreferencesDto } from './dtos/upsert-preferences.dto';

@Controller('/preferences')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
export class PreferencesController {
  constructor(
    private upsertPreferencesUsecase: UpsertPreferences,
    private getPreferences: GetPreferences,
    private getFeatureFlag: GetFeatureFlag
  ) {}

  @Get('/')
  @UseGuards(UserAuthGuard)
  async get(@UserSession() user: UserSessionData, @Query('workflowId') workflowId: string) {
    await this.verifyPreferencesApiAvailability(user);

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
    await this.verifyPreferencesApiAvailability(user);

    return this.upsertPreferencesUsecase.execute(
      UpsertPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        preferences: data.preferences,
        templateId: data.workflowId,
        type: PreferencesTypeEnum.USER_WORKFLOW,
      })
    );
  }

  @Delete('/')
  @UseGuards(UserAuthGuard)
  async delete(@UserSession() user: UserSessionData, @Query('workflowId') workflowId: string) {
    await this.verifyPreferencesApiAvailability(user);

    return this.upsertPreferencesUsecase.execute(
      UpsertPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId: workflowId,
        preferences: null,
        type: PreferencesTypeEnum.USER_WORKFLOW,
      })
    );
  }

  private async verifyPreferencesApiAvailability(user: UserSessionData) {
    const isEnabled = await this.getFeatureFlag.execute(
      GetFeatureFlagCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED,
      })
    );

    if (!isEnabled) {
      throw new NotFoundException();
    }
  }
}

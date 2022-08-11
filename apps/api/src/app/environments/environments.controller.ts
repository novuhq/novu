import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { EnvironmentEntity } from '@novu/dal';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateEnvironment } from './usecases/create-environment/create-environment.usecase';
import { CreateEnvironmentCommand } from './usecases/create-environment/create-environment.command';
import { CreateEnvironmentBodyDto } from './dto/create-environment.dto';
import { GetApiKeysCommand } from './usecases/get-api-keys/get-api-keys.command';
import { GetApiKeys } from './usecases/get-api-keys/get-api-keys.usecase';
import { GetEnvironment, GetEnvironmentCommand } from './usecases/get-environment';
import { GetMyEnvironments } from './usecases/get-my-environments/get-my-environments.usecase';
import { GetMyEnvironmentsCommand } from './usecases/get-my-environments/get-my-environments.command';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UpdateWidgetSettingsDto } from './dto/update-widget-settings.dto';
import { UpdateWidgetSettings } from './usecases/update-widget-settings/update-widget-settings.usecase';
import { UpdateWidgetSettingsCommand } from './usecases/update-widget-settings/update-widget-settings.command';
import { ApiTags } from '@nestjs/swagger';

@Controller('/environments')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Environments')
export class EnvironmentsController {
  constructor(
    private createEnvironmentUsecase: CreateEnvironment,
    private getApiKeysUsecase: GetApiKeys,
    private getEnvironmentUsecase: GetEnvironment,
    private getMyEnvironmentsUsecase: GetMyEnvironments,
    private updateWidgetSettingsUsecase: UpdateWidgetSettings
  ) {}

  @Get('/me')
  async getCurrentEnvironment(@UserSession() user: IJwtPayload): Promise<EnvironmentEntity> {
    return await this.getEnvironmentUsecase.execute(
      GetEnvironmentCommand.create({
        environmentId: user.environmentId,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Post('/')
  async createEnvironment(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateEnvironmentBodyDto
  ): Promise<EnvironmentEntity> {
    return await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        name: body.name,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/')
  async getMyEnvironments(@UserSession() user: IJwtPayload): Promise<EnvironmentEntity[]> {
    return await this.getMyEnvironmentsUsecase.execute(
      GetMyEnvironmentsCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/api-keys')
  async getOrganizationApiKeys(@UserSession() user: IJwtPayload) {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.getApiKeysUsecase.execute(command);
  }

  @Put('/widget/settings')
  async updateWidgetSettings(@UserSession() user: IJwtPayload, @Body() body: UpdateWidgetSettingsDto) {
    const command = UpdateWidgetSettingsCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      notificationCenterEncryption: body.notificationCenterEncryption,
    });

    return await this.updateWidgetSettingsUsecase.execute(command);
  }
}

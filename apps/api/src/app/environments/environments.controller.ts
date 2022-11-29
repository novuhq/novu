import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateEnvironment } from './usecases/create-environment/create-environment.usecase';
import { CreateEnvironmentCommand } from './usecases/create-environment/create-environment.command';
import { CreateEnvironmentRequestDto } from './dtos/create-environment-request.dto';
import { GetApiKeysCommand } from './usecases/get-api-keys/get-api-keys.command';
import { GetApiKeys } from './usecases/get-api-keys/get-api-keys.usecase';
import { GetEnvironment, GetEnvironmentCommand } from './usecases/get-environment';
import { GetMyEnvironments } from './usecases/get-my-environments/get-my-environments.usecase';
import { GetMyEnvironmentsCommand } from './usecases/get-my-environments/get-my-environments.command';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UpdateWidgetSettingsRequestDto } from './dtos/update-widget-settings-request.dto';
import { UpdateWidgetSettings } from './usecases/update-widget-settings/update-widget-settings.usecase';
import { UpdateWidgetSettingsCommand } from './usecases/update-widget-settings/update-widget-settings.command';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKey } from '../shared/dtos/api-key';
import { EnvironmentResponseDto } from './dtos/environment-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { RegenerateApiKeys } from './usecases/regenerate-api-keys/regenerate-api-keys.usecase';
import { UpdateEnvironmentCommand } from './usecases/update-environment/update-environment.command';
import { UpdateEnvironment } from './usecases/update-environment/update-environment.usecase';
import { UpdateEnvironmentRequestDto } from './dtos/update-environment-request.dto';

@Controller('/environments')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Environments')
export class EnvironmentsController {
  constructor(
    private createEnvironmentUsecase: CreateEnvironment,
    private updateEnvironmentUsecase: UpdateEnvironment,
    private getApiKeysUsecase: GetApiKeys,
    private regenerateApiKeysUsecase: RegenerateApiKeys,
    private getEnvironmentUsecase: GetEnvironment,
    private getMyEnvironmentsUsecase: GetMyEnvironments,
    private updateWidgetSettingsUsecase: UpdateWidgetSettings
  ) {}

  @Get('/me')
  @ApiOperation({
    summary: 'Get current environment',
  })
  @ApiOkResponse({
    type: EnvironmentResponseDto,
  })
  @ExternalApiAccessible()
  async getCurrentEnvironment(@UserSession() user: IJwtPayload): Promise<EnvironmentResponseDto> {
    return await this.getEnvironmentUsecase.execute(
      GetEnvironmentCommand.create({
        environmentId: user.environmentId,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Post('/')
  @ApiOperation({
    summary: 'Create environment',
  })
  @ApiCreatedResponse({
    type: EnvironmentResponseDto,
  })
  @ExternalApiAccessible()
  async createEnvironment(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateEnvironmentRequestDto
  ): Promise<EnvironmentResponseDto> {
    return await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        name: body.name,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/')
  @Get('/me')
  @ApiOperation({
    summary: 'Get environments',
  })
  @ApiOkResponse({
    type: [EnvironmentResponseDto],
  })
  @ExternalApiAccessible()
  async getMyEnvironments(@UserSession() user: IJwtPayload): Promise<EnvironmentResponseDto[]> {
    return await this.getMyEnvironmentsUsecase.execute(
      GetMyEnvironmentsCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Put('/:environmentId')
  @ApiOperation({
    summary: 'Update env by id',
  })
  async updateMyEnvironment(
    @UserSession() user: IJwtPayload,
    @Param('environmentId') environmentId: string,
    @Body() payload: UpdateEnvironmentRequestDto
  ) {
    return await this.updateEnvironmentUsecase.execute(
      UpdateEnvironmentCommand.create({
        environmentId: environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        name: payload.name,
        identifier: payload.identifier,
        _parentId: payload.parentId,
      })
    );
  }

  @Get('/api-keys')
  @Get('/me')
  @ApiOperation({
    summary: 'Get api keys',
  })
  @ApiOkResponse({
    type: [ApiKey],
  })
  @ExternalApiAccessible()
  async getOrganizationApiKeys(@UserSession() user: IJwtPayload): Promise<ApiKey[]> {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.getApiKeysUsecase.execute(command);
  }

  @Post('/api-keys/regenerate')
  @ApiOperation({
    summary: 'Regenerate api keys',
  })
  @ApiOkResponse({
    type: [ApiKey],
  })
  @ExternalApiAccessible()
  async regenerateOrganizationApiKeys(@UserSession() user: IJwtPayload): Promise<ApiKey[]> {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.regenerateApiKeysUsecase.execute(command);
  }

  @Put('/widget/settings')
  @ApiOperation({
    summary: 'Update widget settings',
  })
  @ApiOkResponse({
    type: EnvironmentResponseDto,
  })
  @ExternalApiAccessible()
  async updateWidgetSettings(
    @UserSession() user: IJwtPayload,
    @Body() body: UpdateWidgetSettingsRequestDto
  ): Promise<EnvironmentResponseDto> {
    const command = UpdateWidgetSettingsCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      notificationCenterEncryption: body.notificationCenterEncryption,
    });

    return await this.updateWidgetSettingsUsecase.execute(command);
  }
}

import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FeatureFlagsKeysEnum, PermissionsEnum, ProductFeatureKeyEnum, UserSessionData } from '@novu/shared';
import { FeatureFlagsService, RequirePermissions, SkipPermissionsCheck } from '@novu/application-generic';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ProductFeature } from '../shared/decorators/product-feature.decorator';
import { ApiKey } from '../shared/dtos/api-key';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateEnvironmentRequestDto } from './dtos/create-environment-request.dto';
import { EnvironmentResponseDto } from './dtos/environment-response.dto';
import { UpdateEnvironmentRequestDto } from './dtos/update-environment-request.dto';
import { CreateEnvironmentCommand } from './usecases/create-environment/create-environment.command';
import { CreateEnvironment } from './usecases/create-environment/create-environment.usecase';
import { DeleteEnvironmentCommand } from './usecases/delete-environment/delete-environment.command';
import { DeleteEnvironment } from './usecases/delete-environment/delete-environment.usecase';
import { GetApiKeysCommand } from './usecases/get-api-keys/get-api-keys.command';
import { GetApiKeys } from './usecases/get-api-keys/get-api-keys.usecase';
import { GetEnvironment, GetEnvironmentCommand } from './usecases/get-environment';
import { GetMyEnvironmentsCommand } from './usecases/get-my-environments/get-my-environments.command';
import { GetMyEnvironments } from './usecases/get-my-environments/get-my-environments.usecase';
import { RegenerateApiKeys } from './usecases/regenerate-api-keys/regenerate-api-keys.usecase';
import { UpdateEnvironmentCommand } from './usecases/update-environment/update-environment.command';
import { UpdateEnvironment } from './usecases/update-environment/update-environment.usecase';
import { ErrorDto } from '../../error-dto';
import { RequireAuthentication } from '../auth/framework/auth.decorator';

/**
 * @deprecated use EnvironmentsControllerV2
 */
@ApiCommonResponses()
@Controller('/environments')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Environments')
export class EnvironmentsControllerV1 {
  constructor(
    private createEnvironmentUsecase: CreateEnvironment,
    private updateEnvironmentUsecase: UpdateEnvironment,
    private getApiKeysUsecase: GetApiKeys,
    private regenerateApiKeysUsecase: RegenerateApiKeys,
    private getEnvironmentUsecase: GetEnvironment,
    private getMyEnvironmentsUsecase: GetMyEnvironments,
    private deleteEnvironmentUsecase: DeleteEnvironment,
    private featureFlagService: FeatureFlagsService
  ) {}

  @Get('/me')
  @ApiOperation({
    summary: 'Get current environment',
  })
  @ApiResponse(EnvironmentResponseDto)
  @ExternalApiAccessible()
  @ApiExcludeEndpoint()
  @SkipPermissionsCheck()
  async getCurrentEnvironment(@UserSession() user: UserSessionData): Promise<EnvironmentResponseDto> {
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
  @ApiResponse(EnvironmentResponseDto, 201)
  @ApiResponse(ErrorDto, 402, false, false)
  @ProductFeature(ProductFeatureKeyEnum.MANAGE_ENVIRONMENTS)
  @SdkGroupName('Environments')
  @SdkMethodName('create')
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_CREATE)
  async createEnvironment(
    @UserSession() user: UserSessionData,
    @Body() body: CreateEnvironmentRequestDto
  ): Promise<EnvironmentResponseDto> {
    const isRbacEnabled = await this.featureFlagService.getFlag({
      organization: { _id: user.organizationId },
      user: { _id: user._id },
      key: FeatureFlagsKeysEnum.IS_RBAC_ENABLED,
      defaultValue: false,
    });

    return await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        name: body.name,
        userId: user._id,
        organizationId: user.organizationId,
        color: body.color,
        system: false,
        returnApiKeys: isRbacEnabled ? user.permissions.includes(PermissionsEnum.API_KEY_READ) : true,
      })
    );
  }

  @Get('/')
  @ApiOperation({
    summary: 'Get environments',
  })
  @ApiResponse(EnvironmentResponseDto, 200, true)
  @ExternalApiAccessible()
  @ApiExcludeEndpoint()
  @SkipPermissionsCheck()
  async listMyEnvironments(@UserSession() user: UserSessionData): Promise<EnvironmentResponseDto[]> {
    const isRbacEnabled = await this.featureFlagService.getFlag({
      organization: { _id: user.organizationId },
      user: { _id: user._id },
      key: FeatureFlagsKeysEnum.IS_RBAC_ENABLED,
      defaultValue: false,
    });

    return await this.getMyEnvironmentsUsecase.execute(
      GetMyEnvironmentsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        returnApiKeys: isRbacEnabled ? user.permissions.includes(PermissionsEnum.API_KEY_READ) : true,
      })
    );
  }

  @Put('/:environmentId')
  @ApiOperation({
    summary: 'Update env by id',
  })
  @ApiExcludeEndpoint()
  @ApiResponse(EnvironmentResponseDto)
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_CREATE)
  async updateMyEnvironment(
    @UserSession() user: UserSessionData,
    @Param('environmentId') environmentId: string,
    @Body() payload: UpdateEnvironmentRequestDto
  ) {
    return await this.updateEnvironmentUsecase.execute(
      UpdateEnvironmentCommand.create({
        environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        name: payload.name,
        identifier: payload.identifier,
        _parentId: payload.parentId,
        color: payload.color,
        dns: payload.dns,
        bridge: payload.bridge,
      })
    );
  }

  @Get('/api-keys')
  @ApiOperation({
    summary: 'Get api keys',
  })
  @ApiResponse(ApiKey, 200, true)
  @ExternalApiAccessible()
  @SdkGroupName('Environments.ApiKeys')
  @ApiExcludeEndpoint()
  @RequirePermissions(PermissionsEnum.API_KEY_READ)
  async listOrganizationApiKeys(@UserSession() user: UserSessionData): Promise<ApiKey[]> {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.getApiKeysUsecase.execute(command);
  }

  @Post('/api-keys/regenerate')
  @ApiResponse(ApiKey, 201, true)
  @ApiExcludeEndpoint()
  @RequirePermissions(PermissionsEnum.API_KEY_CREATE)
  async regenerateOrganizationApiKeys(@UserSession() user: UserSessionData): Promise<ApiKey[]> {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.regenerateApiKeysUsecase.execute(command);
  }

  @Delete('/:environmentId')
  @ApiOperation({
    summary: 'Delete environment',
  })
  @ApiParam({ name: 'environmentId', type: String, required: true })
  @ProductFeature(ProductFeatureKeyEnum.MANAGE_ENVIRONMENTS)
  @ApiExcludeEndpoint()
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_DELETE)
  async deleteEnvironment(@UserSession() user: UserSessionData, @Param('environmentId') environmentId: string) {
    return await this.deleteEnvironmentUsecase.execute(
      DeleteEnvironmentCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId,
      })
    );
  }
}

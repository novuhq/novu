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
import {
  FeatureFlagsService,
  ProductFeature,
  RequirePermissions,
  SkipPermissionsCheck,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  PermissionsEnum,
  ProductFeatureKeyEnum,
  UserSessionData,
} from '@novu/shared';
import { ErrorDto } from '../../error-dto';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
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
    private organizationRepository: CommunityOrganizationRepository,
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
    summary: 'Create an environment',
    description: `Creates a new environment within the current organization. 
    Environments allow you to manage different stages of your application development lifecycle.
    Each environment has its own set of API keys and configurations.`,
  })
  @ApiResponse(EnvironmentResponseDto, 201)
  @ApiResponse(ErrorDto, 402, false, false)
  @ProductFeature(ProductFeatureKeyEnum.MANAGE_ENVIRONMENTS)
  @SdkGroupName('Environments')
  @SdkMethodName('create')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_WRITE)
  async createEnvironment(
    @UserSession() user: UserSessionData,
    @Body() body: CreateEnvironmentRequestDto
  ): Promise<EnvironmentResponseDto> {
    const canAccessApiKeys = await this.canUserAccessApiKeys(user);

    return await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        name: body.name,
        userId: user._id,
        organizationId: user.organizationId,
        color: body.color,
        system: false,
        returnApiKeys: canAccessApiKeys,
      })
    );
  }

  @Get('/')
  @ApiOperation({
    summary: 'List all environments',
    description: `This API returns a list of environments for the current organization. 
    Each environment contains its configuration, API keys (if user has access), and metadata.`,
  })
  @ApiResponse(EnvironmentResponseDto, 200, true)
  @SdkGroupName('Environments')
  @SdkMethodName('list')
  @ExternalApiAccessible()
  @SkipPermissionsCheck()
  async listMyEnvironments(@UserSession() user: UserSessionData): Promise<EnvironmentResponseDto[]> {
    const canAccessApiKeys = await this.canUserAccessApiKeys(user);

    return await this.getMyEnvironmentsUsecase.execute(
      GetMyEnvironmentsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        returnApiKeys: canAccessApiKeys,
        userId: user._id,
      })
    );
  }

  @Put('/:environmentId')
  @ApiOperation({
    summary: 'Update an environment',
    description: `Update an environment by its unique identifier **environmentId**. 
    You can modify the environment name, identifier, color, and other configuration settings.`,
  })
  @ApiParam({ name: 'environmentId', description: 'The unique identifier of the environment', type: String })
  @ApiResponse(EnvironmentResponseDto)
  @SdkGroupName('Environments')
  @SdkMethodName('update')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_WRITE)
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
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
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
    summary: 'Delete an environment',
    description: `Delete an environment by its unique identifier **environmentId**. 
    This action is irreversible and will remove the environment and all its associated data.`,
  })
  @ApiParam({ name: 'environmentId', description: 'The unique identifier of the environment', type: String })
  @ProductFeature(ProductFeatureKeyEnum.MANAGE_ENVIRONMENTS)
  @SdkGroupName('Environments')
  @SdkMethodName('delete')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_WRITE)
  async deleteEnvironment(@UserSession() user: UserSessionData, @Param('environmentId') environmentId: string) {
    return await this.deleteEnvironmentUsecase.execute(
      DeleteEnvironmentCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId,
      })
    );
  }

  private async canUserAccessApiKeys(user: UserSessionData): Promise<boolean> {
    const organization = await this.organizationRepository.findOne({
      _id: user.organizationId,
    });

    const [isRbacFlagEnabled, isRbacFeatureEnabled] = await Promise.all([
      this.featureFlagService.getFlag({
        organization: { _id: user.organizationId },
        user: { _id: user._id },
        key: FeatureFlagsKeysEnum.IS_RBAC_ENABLED,
        defaultValue: false,
      }),
      getFeatureForTierAsBoolean(
        FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
        organization?.apiServiceLevel || ApiServiceLevelEnum.FREE
      ),
    ]);

    const isRbacEnabled = isRbacFlagEnabled && isRbacFeatureEnabled;

    if (!isRbacEnabled) {
      return true;
    }

    return user.permissions.includes(PermissionsEnum.API_KEY_READ);
  }
}

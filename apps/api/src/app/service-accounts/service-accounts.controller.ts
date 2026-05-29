import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequiresEnvironment } from '../auth/decorators/requires-environment.decorator';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiKeyV2EnvironmentGuard } from '../auth/guards/api-key-v2-environment.guard';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiNoContentResponse, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  ApiKeyCredentialResponseDto,
  CreateApiKeyCredentialRequestDto,
  CreateApiKeyCredentialResponseDto,
  CreateServiceAccountRequestDto,
  ServiceAccountResponseDto,
} from './dtos';
import { ApiKeysV2EnabledGuard } from './guards/api-keys-v2-enabled.guard';
import {
  CreateApiKeyCredential,
  CreateApiKeyCredentialCommand,
  CreateServiceAccount,
  CreateServiceAccountCommand,
  DeleteServiceAccount,
  DeleteServiceAccountCommand,
  ListApiKeyCredentials,
  ListApiKeyCredentialsCommand,
  ListServiceAccounts,
  ListServiceAccountsCommand,
  RevokeApiKeyCredential,
  RevokeApiKeyCredentialCommand,
  RotateApiKeyCredential,
  RotateApiKeyCredentialCommand,
} from './usecases';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/service-accounts')
@ApiTags('Service Accounts')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@UseGuards(ApiKeysV2EnabledGuard, ApiKeyV2EnvironmentGuard)
export class ServiceAccountsController {
  constructor(
    private readonly createServiceAccountUsecase: CreateServiceAccount,
    private readonly listServiceAccountsUsecase: ListServiceAccounts,
    private readonly deleteServiceAccountUsecase: DeleteServiceAccount,
    private readonly createApiKeyCredentialUsecase: CreateApiKeyCredential,
    private readonly listApiKeyCredentialsUsecase: ListApiKeyCredentials,
    private readonly revokeApiKeyCredentialUsecase: RevokeApiKeyCredential,
    private readonly rotateApiKeyCredentialUsecase: RotateApiKeyCredential
  ) {}

  @Get('/')
  @RequiresEnvironment(false)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_READ)
  @ApiOperation({ summary: 'List service accounts' })
  @ApiResponse(ServiceAccountResponseDto, 200, true)
  async listServiceAccounts(
    @UserSession() user: UserSessionData,
    @Query('environmentId') environmentId?: string
  ): Promise<ServiceAccountResponseDto[]> {
    return this.listServiceAccountsUsecase.execute(
      ListServiceAccountsCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: environmentId || user.environmentId,
      })
    );
  }

  @Post('/')
  @RequiresEnvironment(false)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
  @ApiOperation({ summary: 'Create a service account' })
  @ApiResponse(ServiceAccountResponseDto, 201)
  async createServiceAccount(
    @UserSession() user: UserSessionData,
    @Body() body: CreateServiceAccountRequestDto
  ): Promise<ServiceAccountResponseDto> {
    return this.createServiceAccountUsecase.execute(
      CreateServiceAccountCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        name: body.name,
        scope: body.scope,
        environmentId: body.environmentId,
        defaultPermissions: body.defaultPermissions,
        metadata: body.metadata,
      })
    );
  }

  @Delete('/:serviceAccountId')
  @RequiresEnvironment(false)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service account' })
  @ApiParam({ name: 'serviceAccountId' })
  @ApiNoContentResponse()
  async deleteServiceAccount(
    @UserSession() user: UserSessionData,
    @Param('serviceAccountId') serviceAccountId: string
  ): Promise<void> {
    await this.deleteServiceAccountUsecase.execute(
      DeleteServiceAccountCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        serviceAccountId,
      })
    );
  }

  @Get('/:serviceAccountId/keys')
  @RequiresEnvironment(false)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_READ)
  @ApiOperation({ summary: 'List API keys for a service account' })
  @ApiParam({ name: 'serviceAccountId' })
  @ApiResponse(ApiKeyCredentialResponseDto, 200, true)
  async listApiKeys(
    @UserSession() user: UserSessionData,
    @Param('serviceAccountId') serviceAccountId: string
  ): Promise<ApiKeyCredentialResponseDto[]> {
    return this.listApiKeyCredentialsUsecase.execute(
      ListApiKeyCredentialsCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        serviceAccountId,
      })
    );
  }

  @Post('/:serviceAccountId/keys')
  @RequiresEnvironment(false)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
  @ApiOperation({ summary: 'Create an API key for a service account' })
  @ApiParam({ name: 'serviceAccountId' })
  @ApiResponse(CreateApiKeyCredentialResponseDto, 201)
  async createApiKey(
    @UserSession() user: UserSessionData,
    @Param('serviceAccountId') serviceAccountId: string,
    @Body() body: CreateApiKeyCredentialRequestDto
  ): Promise<CreateApiKeyCredentialResponseDto> {
    return this.createApiKeyCredentialUsecase.execute(
      CreateApiKeyCredentialCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        serviceAccountId,
        name: body.name,
        permissions: body.permissions,
        metadata: body.metadata,
        expiresAt: body.expiresAt,
      })
    );
  }

  @Post('/:serviceAccountId/keys/:apiKeyId/revoke')
  @RequiresEnvironment(false)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'serviceAccountId' })
  @ApiParam({ name: 'apiKeyId' })
  @ApiNoContentResponse()
  async revokeApiKey(
    @UserSession() user: UserSessionData,
    @Param('serviceAccountId') serviceAccountId: string,
    @Param('apiKeyId') apiKeyId: string
  ): Promise<void> {
    await this.revokeApiKeyCredentialUsecase.execute(
      RevokeApiKeyCredentialCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        serviceAccountId,
        apiKeyId,
      })
    );
  }

  @Post('/:serviceAccountId/keys/:apiKeyId/rotate')
  @RequiresEnvironment(false)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
  @ApiOperation({ summary: 'Rotate an API key (revoke old, create new)' })
  @ApiParam({ name: 'serviceAccountId' })
  @ApiParam({ name: 'apiKeyId' })
  @ApiResponse(CreateApiKeyCredentialResponseDto, 201)
  async rotateApiKey(
    @UserSession() user: UserSessionData,
    @Param('serviceAccountId') serviceAccountId: string,
    @Param('apiKeyId') apiKeyId: string
  ): Promise<CreateApiKeyCredentialResponseDto> {
    return this.rotateApiKeyCredentialUsecase.execute(
      RotateApiKeyCredentialCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        serviceAccountId,
        apiKeyId,
      })
    );
  }
}

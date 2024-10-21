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
import { ApiAuthSchemeEnum, MemberRoleEnum, UserSessionData } from '@novu/shared';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard, Roles } from '@novu/application-generic';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateEnvironment } from './usecases/create-environment/create-environment.usecase';
import { CreateEnvironmentCommand } from './usecases/create-environment/create-environment.command';
import { CreateEnvironmentRequestDto } from './dtos/create-environment-request.dto';
import { GetApiKeysCommand } from './usecases/get-api-keys/get-api-keys.command';
import { GetApiKeys } from './usecases/get-api-keys/get-api-keys.usecase';
import { GetEnvironment, GetEnvironmentCommand } from './usecases/get-environment';
import { GetMyEnvironments } from './usecases/get-my-environments/get-my-environments.usecase';
import { GetMyEnvironmentsCommand } from './usecases/get-my-environments/get-my-environments.command';
import { ApiKey } from '../shared/dtos/api-key';
import { EnvironmentResponseDto } from './dtos/environment-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { RegenerateApiKeys } from './usecases/regenerate-api-keys/regenerate-api-keys.usecase';
import { UpdateEnvironmentCommand } from './usecases/update-environment/update-environment.command';
import { UpdateEnvironment } from './usecases/update-environment/update-environment.usecase';
import { UpdateEnvironmentRequestDto } from './dtos/update-environment-request.dto';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkGroupName } from '../shared/framework/swagger/sdk.decorators';

/**
 * @deprecated use EnvironmentsControllerV2
 */
@ApiCommonResponses()
@Controller('/environments')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Environments')
export class EnvironmentsControllerV1 {
  constructor(
    private createEnvironmentUsecase: CreateEnvironment,
    private updateEnvironmentUsecase: UpdateEnvironment,
    private getApiKeysUsecase: GetApiKeys,
    private regenerateApiKeysUsecase: RegenerateApiKeys,
    private getEnvironmentUsecase: GetEnvironment,
    private getMyEnvironmentsUsecase: GetMyEnvironments
  ) {}

  @Get('/me')
  @ApiOperation({
    summary: 'Get current environment',
  })
  @ApiResponse(EnvironmentResponseDto)
  @ExternalApiAccessible()
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
  @ApiExcludeEndpoint()
  @ApiResponse(EnvironmentResponseDto, 201)
  async createEnvironment(
    @UserSession() user: UserSessionData,
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
  @ApiOperation({
    summary: 'Get environments',
  })
  @ApiResponse(EnvironmentResponseDto, 200, true)
  @ExternalApiAccessible()
  async listMyEnvironments(@UserSession() user: UserSessionData): Promise<EnvironmentResponseDto[]> {
    return await this.getMyEnvironmentsUsecase.execute(
      GetMyEnvironmentsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        includeAllApiKeys: user.scheme === ApiAuthSchemeEnum.BEARER,
      })
    );
  }

  @Put('/:environmentId')
  @ApiOperation({
    summary: 'Update env by id',
  })
  @ApiExcludeEndpoint()
  @ApiResponse(EnvironmentResponseDto)
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
  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  async regenerateOrganizationApiKeys(@UserSession() user: UserSessionData): Promise<ApiKey[]> {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.regenerateApiKeysUsecase.execute(command);
  }
}

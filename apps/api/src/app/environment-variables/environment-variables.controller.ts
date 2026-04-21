import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import {
  ApiCommonResponses,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';

import { SdkMethodName } from '../shared/framework/swagger/sdk.decorators';

import { UserSession } from '../shared/framework/user.decorator';
import {
  CreateEnvironmentVariableRequestDto,
  EnvironmentVariableResponseDto,
  GetEnvironmentVariablesRequestDto,
  GetEnvironmentVariableUsageResponseDto,
  UpdateEnvironmentVariableRequestDto,
} from './dtos';
import {
  CreateEnvironmentVariable,
  CreateEnvironmentVariableCommand,
  DeleteEnvironmentVariable,
  DeleteEnvironmentVariableCommand,
  GetEnvironmentVariable,
  GetEnvironmentVariableCommand,
  GetEnvironmentVariables,
  GetEnvironmentVariablesCommand,
  GetEnvironmentVariableUsage,
  GetEnvironmentVariableUsageCommand,
  UpdateEnvironmentVariable,
  UpdateEnvironmentVariableCommand,
} from './usecases';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/environment-variables')
@ApiTags('Environment Variables')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
export class EnvironmentVariablesController {
  constructor(
    private getEnvironmentVariablesUsecase: GetEnvironmentVariables,
    private getEnvironmentVariableUsecase: GetEnvironmentVariable,
    private getEnvironmentVariableUsageUsecase: GetEnvironmentVariableUsage,
    private createEnvironmentVariableUsecase: CreateEnvironmentVariable,
    private updateEnvironmentVariableUsecase: UpdateEnvironmentVariable,
    private deleteEnvironmentVariableUsecase: DeleteEnvironmentVariable
  ) {}

  @Get('/')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @ApiResponse(EnvironmentVariableResponseDto, 200, true)
  @ApiOperation({
    summary: 'List all variables',
    description: 'Returns all environment variables for the current organization. Secret values are masked.',
  })
  async listEnvironmentVariables(
    @UserSession() user: UserSessionData,
    @Query() query: GetEnvironmentVariablesRequestDto
  ): Promise<EnvironmentVariableResponseDto[]> {
    return this.getEnvironmentVariablesUsecase.execute(
      GetEnvironmentVariablesCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        search: query.search,
      })
    );
  }

  @Get('/:variableKey/usage')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @SdkMethodName('usage')
  @ApiParam({
    name: 'variableKey',
    description: 'The unique key of the environment variable (e.g. BASE_URL)',
    type: String,
    example: 'BASE_URL',
  })
  @ApiResponse(GetEnvironmentVariableUsageResponseDto)
  @ApiOperation({
    summary: 'Retrieve a variable usage',
    description:
      'Returns the workflows that reference this environment variable via `{{env.KEY}}` in their step controls. **variableId** is required.',
  })
  @ApiNotFoundResponse({ description: 'Environment variable not found.' })
  async getEnvironmentVariableUsage(
    @UserSession() user: UserSessionData,
    @Param('variableKey') variableKey: string
  ): Promise<GetEnvironmentVariableUsageResponseDto> {
    return this.getEnvironmentVariableUsageUsecase.execute(
      GetEnvironmentVariableUsageCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        variableKey,
      })
    );
  }

  @Get('/:variableKey')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @SdkMethodName('retrieve')
  @ApiParam({
    name: 'variableKey',
    description: 'The unique key of the environment variable (e.g. BASE_URL)',
    type: String,
    example: 'BASE_URL',
  })
  @ApiResponse(EnvironmentVariableResponseDto)
  @ApiOperation({
    summary: 'Get environment variable',
    description: 'Returns a single environment variable by key. Secret values are masked.',
  })
  @ApiNotFoundResponse({ description: 'Environment variable not found.' })
  async getEnvironmentVariable(
    @UserSession() user: UserSessionData,
    @Param('variableKey') variableKey: string
  ): Promise<EnvironmentVariableResponseDto> {
    return this.getEnvironmentVariableUsecase.execute(
      GetEnvironmentVariableCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        variableKey,
      })
    );
  }

  @Post('/')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ApiResponse(EnvironmentVariableResponseDto)
  @ApiOperation({
    summary: 'Create a variable',
    description:
      'Creates a new environment variable. Keys must be uppercase with underscores only (e.g. BASE_URL). ' +
      'Secret variables are encrypted at rest and masked in API responses.',
  })
  @ApiConflictResponse({ description: 'An environment variable with the same key already exists.' })
  async createEnvironmentVariable(
    @UserSession() user: UserSessionData,
    @Body() body: CreateEnvironmentVariableRequestDto
  ): Promise<EnvironmentVariableResponseDto> {
    return this.createEnvironmentVariableUsecase.execute(
      CreateEnvironmentVariableCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        key: body.key,
        type: body.type,
        isSecret: body.isSecret,
        values: body.values,
      })
    );
  }

  @Patch('/:variableKey')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ApiParam({
    name: 'variableKey',
    description: 'The unique key of the environment variable (e.g. BASE_URL)',
    type: String,
    example: 'BASE_URL',
  })
  @ApiResponse(EnvironmentVariableResponseDto)
  @ApiOperation({
    summary: 'Update a variable',
    description:
      'Updates an existing environment variable. Providing values replaces all existing per-environment values.',
  })
  @ApiNotFoundResponse({ description: 'Environment variable not found.' })
  async updateEnvironmentVariable(
    @UserSession() user: UserSessionData,
    @Param('variableKey') variableKey: string,
    @Body() body: UpdateEnvironmentVariableRequestDto
  ): Promise<EnvironmentVariableResponseDto> {
    return this.updateEnvironmentVariableUsecase.execute(
      UpdateEnvironmentVariableCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        variableKey,
        key: body.key,
        type: body.type,
        isSecret: body.isSecret,
        values: body.values,
      })
    );
  }

  @Delete('/:variableKey')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ApiParam({
    name: 'variableKey',
    description: 'The unique key of the environment variable (e.g. BASE_URL)',
    type: String,
    example: 'BASE_URL',
  })
  @ApiOperation({
    summary: 'Delete environment variable',
    description: 'Deletes an environment variable by key.',
  })
  @ApiNoContentResponse({ description: 'The environment variable has been deleted.' })
  @ApiNotFoundResponse({ description: 'Environment variable not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEnvironmentVariable(
    @UserSession() user: UserSessionData,
    @Param('variableKey') variableKey: string
  ): Promise<void> {
    return this.deleteEnvironmentVariableUsecase.execute(
      DeleteEnvironmentVariableCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        variableKey,
      })
    );
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipPermissionsCheck } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, UserSessionData } from '@novu/shared';
import type { Request } from 'express';
import { getClientIp } from 'request-ip';

import { RequireAuthentication } from '../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../../shared/framework/response.decorator';
import { UserSession } from '../../shared/framework/user.decorator';
import {
  CreateKeylessEnvironmentRequestDto,
  CreateKeylessEnvironmentResponseDto,
  GetKeylessEnvironmentResponseDto,
} from './dtos';
import { GetAgentKeylessEnvironmentCommand } from './usecases/get-agent-keyless-environment/get-agent-keyless-environment.command';
import { GetAgentKeylessEnvironment } from './usecases/get-agent-keyless-environment/get-agent-keyless-environment.usecase';
import { ProvisionAgentKeylessEnvironmentCommand } from './usecases/provision-agent-keyless-environment/provision-agent-keyless-environment.command';
import { ProvisionAgentKeylessEnvironment } from './usecases/provision-agent-keyless-environment/provision-agent-keyless-environment.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/keyless/environments')
@ApiTags('Keyless')
@ApiExcludeController()
export class KeylessEnvironmentsController {
  constructor(
    private readonly provisionAgentKeylessEnvironmentUsecase: ProvisionAgentKeylessEnvironment,
    private readonly getAgentKeylessEnvironmentUsecase: GetAgentKeylessEnvironment
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a keyless environment for an AI agent' })
  @ApiResponse(CreateKeylessEnvironmentResponseDto, 201)
  async createKeylessEnvironment(
    @Body() body: CreateKeylessEnvironmentRequestDto,
    @Req() request: Request
  ): Promise<CreateKeylessEnvironmentResponseDto> {
    return this.provisionAgentKeylessEnvironmentUsecase.execute(
      ProvisionAgentKeylessEnvironmentCommand.create({
        source: body.source,
        clientIp: getClientIp(request) ?? undefined,
        userAgent: request.headers['user-agent'],
      })
    );
  }

  @Get('/me')
  @RequireAuthentication()
  @ExternalApiAccessible()
  @SkipPermissionsCheck()
  @ApiOperation({ summary: 'Get the keyless environment for the current API key' })
  @ApiResponse(GetKeylessEnvironmentResponseDto)
  async getKeylessEnvironment(@UserSession() user: UserSessionData): Promise<GetKeylessEnvironmentResponseDto> {
    return this.getAgentKeylessEnvironmentUsecase.execute(
      GetAgentKeylessEnvironmentCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}

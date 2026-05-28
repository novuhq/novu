import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequirePermissions } from '@novu/application-generic';

import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  ApproveCliDeviceSessionRequestDto,
  ApproveCliDeviceSessionResponseDto,
  CliDeviceSessionPollResponseDto,
  CreateCliDeviceSessionRequestDto,
  CreateCliDeviceSessionResponseDto,
} from './dtos/cli-device-session.dto';
import { ApproveCliDeviceSessionCommand } from './usecases/approve-cli-device-session/approve-cli-device-session.command';
import { ApproveCliDeviceSession } from './usecases/approve-cli-device-session/approve-cli-device-session.usecase';
import { CreateCliDeviceSessionCommand } from './usecases/create-cli-device-session/create-cli-device-session.command';
import { CreateCliDeviceSession } from './usecases/create-cli-device-session/create-cli-device-session.usecase';
import { GetCliDeviceSessionCommand } from './usecases/get-cli-device-session/get-cli-device-session.command';
import { GetCliDeviceSession } from './usecases/get-cli-device-session/get-cli-device-session.usecase';

/**
 * CLI browser authorization without localhost loopback callbacks.
 *
 * Flow:
 * 1. CLI creates a device session (public).
 * 2. User authorizes in the dashboard (Clerk session).
 * 3. Dashboard approves the session via this API (authenticated).
 * 4. CLI polls until approved and receives credentials once (public).
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/cli/device-sessions')
@ApiTags('CLI Auth')
@ApiExcludeController()
export class CliAuthController {
  constructor(
    private readonly createCliDeviceSessionUsecase: CreateCliDeviceSession,
    private readonly getCliDeviceSessionUsecase: GetCliDeviceSession,
    private readonly approveCliDeviceSessionUsecase: ApproveCliDeviceSession
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse(CreateCliDeviceSessionResponseDto, 201)
  @ApiOperation({
    summary: 'Create a CLI device authorization session',
    description:
      'Starts a short-lived device session for browser-based CLI authorization. The CLI polls the session until the dashboard approves it.',
  })
  async createCliDeviceSession(
    @Body() body: CreateCliDeviceSessionRequestDto
  ): Promise<CreateCliDeviceSessionResponseDto> {
    return this.createCliDeviceSessionUsecase.execute(
      CreateCliDeviceSessionCommand.create({
        name: body.name,
      })
    );
  }

  @Get('/:deviceCode')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(CliDeviceSessionPollResponseDto, 200)
  @ApiOperation({
    summary: 'Poll a CLI device authorization session',
    description:
      'Returns pending until the dashboard approves the session, then returns credentials exactly once and deletes the session.',
  })
  async getCliDeviceSession(@Param('deviceCode') deviceCode: string): Promise<CliDeviceSessionPollResponseDto> {
    return this.getCliDeviceSessionUsecase.execute(
      GetCliDeviceSessionCommand.create({
        deviceCode,
      })
    );
  }

  @Post('/:deviceCode/approve')
  @HttpCode(HttpStatus.OK)
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.API_KEY_READ)
  @ApiResponse(ApproveCliDeviceSessionResponseDto, 200)
  @ApiOperation({
    summary: 'Approve a CLI device authorization session',
    description:
      'Called by the dashboard after the user selects an environment. Stores the chosen API key on the device session for the CLI to poll.',
  })
  async approveCliDeviceSession(
    @UserSession() user: UserSessionData,
    @Param('deviceCode') deviceCode: string,
    @Body() body: ApproveCliDeviceSessionRequestDto
  ): Promise<ApproveCliDeviceSessionResponseDto> {
    return this.approveCliDeviceSessionUsecase.execute(
      ApproveCliDeviceSessionCommand.create({
        deviceCode,
        userId: user._id,
        organizationId: user.organizationId,
        apiKey: body.apiKey,
        environmentId: body.environmentId,
        environmentSlug: body.environmentSlug,
        environmentName: body.environmentName,
        environmentOrganizationId: body.organizationId,
        user: body.user ?? null,
      })
    );
  }
}

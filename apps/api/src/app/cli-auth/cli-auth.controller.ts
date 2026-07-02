import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';

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
import { CliDeviceSessionService } from './services/cli-device-session.service';
import { ApproveCliDeviceSessionCommand } from './usecases/approve-cli-device-session/approve-cli-device-session.command';
import { ApproveCliDeviceSession } from './usecases/approve-cli-device-session/approve-cli-device-session.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/cli/device-sessions')
@ApiTags('CLI Auth')
@ApiExcludeController()
export class CliAuthController {
  constructor(
    private readonly cliDeviceSessionService: CliDeviceSessionService,
    private readonly approveCliDeviceSessionUsecase: ApproveCliDeviceSession
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse(CreateCliDeviceSessionResponseDto, 201)
  async createCliDeviceSession(
    @Body() body: CreateCliDeviceSessionRequestDto
  ): Promise<CreateCliDeviceSessionResponseDto> {
    return this.cliDeviceSessionService.create({ name: body.name });
  }

  @Post('/:deviceCode/poll')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(CliDeviceSessionPollResponseDto, 200)
  async pollCliDeviceSession(@Param('deviceCode') deviceCode: string): Promise<CliDeviceSessionPollResponseDto> {
    return this.cliDeviceSessionService.poll(deviceCode);
  }

  @Post('/:deviceCode/approve')
  @HttpCode(HttpStatus.OK)
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.API_KEY_READ)
  @ApiResponse(ApproveCliDeviceSessionResponseDto, 200)
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
        userEmail: user.email ?? null,
        userFirstName: user.firstName ?? null,
        userLastName: user.lastName ?? null,
      })
    );
  }
}

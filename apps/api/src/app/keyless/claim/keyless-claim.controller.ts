import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../auth/framework/auth.decorator';
import { ApiCommonResponses, ApiResponse } from '../../shared/framework/response.decorator';
import { UserSession } from '../../shared/framework/user.decorator';
import { ClaimKeylessEnvironmentRequestDto } from './dtos/claim-keyless-environment-request.dto';
import { ClaimKeylessEnvironmentResponseDto } from './dtos/claim-keyless-environment-response.dto';
import { ClaimKeylessEnvironmentCommand } from './usecases/claim-keyless-environment/claim-keyless-environment.command';
import { ClaimKeylessEnvironment } from './usecases/claim-keyless-environment/claim-keyless-environment.usecase';

@ApiCommonResponses()
@Controller('/keyless/environments')
@ApiTags('Keyless')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class KeylessClaimController {
  constructor(private readonly claimKeylessEnvironmentUsecase: ClaimKeylessEnvironment) {}

  @Post('/claim')
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiResponse(ClaimKeylessEnvironmentResponseDto)
  @ApiOperation({
    summary: 'Claim a keyless environment into your Development environment',
    description:
      'Moves a keyless setup into the authenticated user\u2019s Development environment. For an AI agent keyless ' +
      'environment this also copies its workflows and revokes its secret key; keyless connect sessions are claimed ' +
      'exactly like `POST /v1/connect/claim`.',
  })
  async claimKeylessEnvironment(
    @UserSession() user: UserSessionData,
    @Body() body: ClaimKeylessEnvironmentRequestDto
  ): Promise<ClaimKeylessEnvironmentResponseDto> {
    return this.claimKeylessEnvironmentUsecase.execute(
      ClaimKeylessEnvironmentCommand.create({ user, token: body.token })
    );
  }
}

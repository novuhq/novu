import { Body, ClassSerializerInterceptor, Controller, HttpCode, HttpStatus, Post, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { ClaimKeylessConnectRequestDto } from './dtos/claim-keyless-connect-request.dto';
import { ClaimKeylessConnectResponseDto } from './dtos/claim-keyless-connect-response.dto';
import { ClaimKeylessConnectCommand } from './usecases/claim-keyless-connect/claim-keyless-connect.command';
import { ClaimKeylessConnect } from './usecases/claim-keyless-connect/claim-keyless-connect.usecase';

@ApiCommonResponses()
@Controller('/connect')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class ConnectController {
  constructor(private readonly claimKeylessConnectUsecase: ClaimKeylessConnect) {}

  @Post('/claim')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(ClaimKeylessConnectResponseDto)
  @ApiOperation({
    summary: 'Claim a keyless connect session',
    description:
      'Merges the agent, channel integration, and conversation created during an anonymous keyless `novu connect` ' +
      'session into the authenticated user\u2019s Development environment, so the in-channel conversation continues ' +
      'under their account.',
  })
  async claim(
    @UserSession() user: UserSessionData,
    @Body() body: ClaimKeylessConnectRequestDto
  ): Promise<ClaimKeylessConnectResponseDto> {
    return this.claimKeylessConnectUsecase.execute(
      ClaimKeylessConnectCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        token: body.token,
      })
    );
  }
}

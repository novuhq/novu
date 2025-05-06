import { ClassSerializerInterceptor, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSessionData } from '@novu/shared';
import { ExecutionDetailsResponseDto } from '@novu/application-generic';
import { UserSession } from '../shared/framework/user.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetExecutionDetails, GetExecutionDetailsCommand } from './usecases/get-execution-details';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { ExecutionDetailsRequestDto } from './dtos/execution-details-request.dto';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@ApiCommonResponses()
@Controller('/execution-details')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Execution Details')
@ApiExcludeController()
export class ExecutionDetailsController {
  constructor(private getExecutionDetails: GetExecutionDetails) {}

  @Get('/')
  @ApiOperation({
    summary: 'Get execution details',
  })
  @ApiResponse(ExecutionDetailsResponseDto, 200, true)
  @ExternalApiAccessible()
  async getExecutionDetailsForNotification(
    @UserSession() user: UserSessionData,
    @Query() query: ExecutionDetailsRequestDto
  ): Promise<ExecutionDetailsResponseDto[]> {
    return this.getExecutionDetails.execute(
      GetExecutionDetailsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        notificationId: query.notificationId,
        subscriberId: query.subscriberId,
      })
    );
  }
}

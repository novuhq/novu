import { ClassSerializerInterceptor, Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';
import { ExecutionDetailsResponseDto } from '@novu/application-generic';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetExecutionDetails, GetExecutionDetailsCommand } from './usecases/get-execution-details';
import { ApiResponse } from '../shared/framework/response.decorator';
import { ExecutionDetailsRequestDto } from './dtos/execution-details-request.dto';

@Controller('/execution-details')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Execution Details')
export class ExecutionDetailsController {
  constructor(private getExecutionDetails: GetExecutionDetails) {}

  @Get('/')
  @ApiOperation({
    summary: 'Get execution details',
  })
  @ApiResponse(ExecutionDetailsResponseDto, 200, true)
  @ExternalApiAccessible()
  async getExecutionDetailsForNotification(
    @UserSession() user: IJwtPayload,
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

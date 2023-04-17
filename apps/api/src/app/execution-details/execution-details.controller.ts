import { ClassSerializerInterceptor, Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';
import { ExecutionDetailsResponseDto } from '@novu/application-generic';

import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetExecutionDetails, GetExecutionDetailsCommand } from './usecases/get-execution-details';

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
  @ApiOkResponse({
    type: [ExecutionDetailsResponseDto],
  })
  @ExternalApiAccessible()
  async getExecutionDetailsForNotification(
    @UserSession() user: IJwtPayload,
    @Query('notificationId') notificationId: string,
    @Query('subscriberId') subscriberId: string
  ): Promise<ExecutionDetailsResponseDto[]> {
    return this.getExecutionDetails.execute(
      GetExecutionDetailsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        notificationId,
        subscriberId,
      })
    );
  }
}

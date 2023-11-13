import { ClassSerializerInterceptor, Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';
import { ExecutionDetailsResponseDto } from '@novu/application-generic';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetExecutionDetails, GetExecutionDetailsCommand } from './usecases/get-execution-details';
import { ApiResponse } from '../shared/framework/response.decorator';
import { ExecutionDetailsRequestDto } from './dtos/execution-details-request.dto';
import { ExecutionDetailsPaginatedResponseDto } from './dtos/execution-details-response.dto';

import { GetExecutionDetailsForTransactionIdRequestDto } from './dtos/execution-details-transaction-request.dto';
import {
  GetExecutionDetailsByTransactionId,
  GetExecutionDetailsByTransactionIdCommand,
} from './usecases/get-execution-details-transactionId';

@Controller('/execution-details')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Execution Details')
export class ExecutionDetailsController {
  constructor(
    private getExecutionDetails: GetExecutionDetails,
    private getExecutionDetailsByTransactionId: GetExecutionDetailsByTransactionId
  ) {}

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

  @Get('/transactions/:transactionId')
  @ApiResponse(ExecutionDetailsPaginatedResponseDto)
  @ApiOperation({
    summary: 'Get execution details by transaction id',
  })
  @ExternalApiAccessible()
  async getExecutionDetailsFilterByTransactionId(
    @UserSession() user: IJwtPayload,
    @Param('transactionId') transactionId: string,
    @Query() query: GetExecutionDetailsForTransactionIdRequestDto
  ): Promise<ExecutionDetailsPaginatedResponseDto> {
    return this.getExecutionDetailsByTransactionId.execute(
      GetExecutionDetailsByTransactionIdCommand.create({
        transactionId,
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        page: query.page ?? 0,
        limit: query.limit ?? 10,
      })
    );
  }
}

import { ClassSerializerInterceptor, Controller, Get, UseGuards, UseInterceptors, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';

import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';
import { GetMxRecordCommand } from './usecases/get-mx-record/get-mx-record.command';
import { GetMxRecordResponseDto } from './dtos/get-mx-record.dto';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';

@ApiCommonResponses()
@Controller('/inbound-parse')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiTags('Inbound Parse')
export class InboundParseController {
  constructor(private getMxRecordUsecase: GetMxRecord) {}

  @Get('/mx/status')
  @ApiOperation({
    summary: 'Validate the mx record setup for the inbound parse functionality',
  })
  @ApiResponse(GetMxRecordResponseDto)
  @ExternalApiAccessible()
  async getMxRecordStatus(@UserSession() user: IJwtPayload): Promise<GetMxRecordResponseDto> {
    Logger.log('Getting MX Record Status');

    return await this.getMxRecordUsecase.execute(
      GetMxRecordCommand.create({ environmentId: user.environmentId, organizationId: user.organizationId })
    );
  }
}

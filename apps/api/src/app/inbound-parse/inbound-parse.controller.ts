import { ClassSerializerInterceptor, Controller, Get, Logger, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSessionData } from '@novu/shared';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';
import { GetMxRecordCommand } from './usecases/get-mx-record/get-mx-record.command';
import { GetMxRecordResponseDto } from './dtos/get-mx-record.dto';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@ApiCommonResponses()
@Controller('/inbound-parse')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Inbound Parse')
@ApiExcludeController()
export class InboundParseController {
  constructor(private getMxRecordUsecase: GetMxRecord) {}

  @Get('/mx/status')
  @ApiOperation({
    summary: 'Validate the mx record setup for the inbound parse functionality',
  })
  @ApiResponse(GetMxRecordResponseDto)
  @ExternalApiAccessible()
  async getMxRecordStatus(@UserSession() user: UserSessionData): Promise<GetMxRecordResponseDto> {
    Logger.log('Getting MX Record Status');

    return await this.getMxRecordUsecase.execute(
      GetMxRecordCommand.create({ environmentId: user.environmentId, organizationId: user.organizationId })
    );
  }
}

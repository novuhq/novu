import { ClassSerializerInterceptor, Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSessionData } from '@novu/shared';
import { PinoLogger } from '@novu/application-generic';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';
import { GetMxRecordCommand } from './usecases/get-mx-record/get-mx-record.command';
import { GetMxRecordResponseDto } from './dtos/get-mx-record.dto';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { RequireAuthentication } from '../auth/framework/auth.decorator';

@ApiCommonResponses()
@Controller('/inbound-parse')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Inbound Parse')
@ApiExcludeController()
export class InboundParseController {
  constructor(
    private getMxRecordUsecase: GetMxRecord,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @Get('/mx/status')
  @ApiOperation({
    summary: 'Validate the mx record setup for the inbound parse functionality',
  })
  @ApiResponse(GetMxRecordResponseDto)
  @ExternalApiAccessible()
  async getMxRecordStatus(@UserSession() user: UserSessionData): Promise<GetMxRecordResponseDto> {
    this.logger.info('Getting MX Record Status');

    return await this.getMxRecordUsecase.execute(
      GetMxRecordCommand.create({ environmentId: user.environmentId, organizationId: user.organizationId })
    );
  }
}

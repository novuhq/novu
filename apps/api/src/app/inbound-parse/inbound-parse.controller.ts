import { ClassSerializerInterceptor, Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { IJwtPayload } from '@novu/shared';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';
import { GetMxRecordCommand } from './usecases/get-mx-record/get-mx-record.command';
import { GetMxRecordResponseDto } from './dtos/get-mx-record.dto';

@Controller('/inbound-parse')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('inbound-parse')
export class InboundParseController {
  constructor(private getMxRecordUsecase: GetMxRecord) {}

  @Get('/mx/status')
  @ApiOperation({
    summary: 'Validate the mx record setup for the inbound parse functionality',
  })
  @ApiOkResponse({
    type: [GetMxRecordResponseDto],
  })
  @ExternalApiAccessible()
  async getMxRecordStatus(@UserSession() user: IJwtPayload): Promise<GetMxRecordResponseDto> {
    return await this.getMxRecordUsecase.execute(
      GetMxRecordCommand.create({ environmentId: user.environmentId, organizationId: user.organizationId })
    );
  }
}

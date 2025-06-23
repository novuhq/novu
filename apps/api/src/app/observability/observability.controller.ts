import { ClassSerializerInterceptor, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ExternalApiAccessible, UserSession } from '@novu/application-generic';
import { ApiTags } from '@nestjs/swagger';
import { GetHttpLogs } from './usecases/get-http-logs/get-http-logs.usecase';
import { GetHttpLogsCommand } from './usecases/get-http-logs/get-http-logs.command';
import { GetHttpLogsDto } from './dtos/get-http-logs.dto';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetHttpLogsResponseDto } from './dtos/get-http-logs-response.dto';

@Controller('observability')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Observability')
export class ObservabilityController {
  constructor(private getHttpLogsUsecase: GetHttpLogs) {}

  @Get('http-logs')
  @ExternalApiAccessible()
  async getLogs(
    @UserSession() user,
    @Query()
    query: GetHttpLogsDto
  ): Promise<GetHttpLogsResponseDto> {
    const command = GetHttpLogsCommand.create({
      organizationId: user.organizationId,
      userId: user._id,
      ...query,
    });

    return this.getHttpLogsUsecase.execute(command);
  }
}

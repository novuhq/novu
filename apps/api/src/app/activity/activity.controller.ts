import { ClassSerializerInterceptor, Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible, RequirePermissions, UserSession } from '@novu/application-generic';
import { PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetChartsRequestDto } from './dtos/get-charts.request.dto';
import { GetChartsResponseDto } from './dtos/get-charts.response.dto';
import { GetRequestResponseDto } from './dtos/get-request-traces.response.dto';
import { GetRequestsDto } from './dtos/get-requests.dto';
import { GetRequestsResponseDto } from './dtos/get-requests.response.dto';
import { GetWorkflowRunResponseDto } from './dtos/workflow-run-response.dto';
import { GetWorkflowRunsRequestDto } from './dtos/workflow-runs-request.dto';
import { GetWorkflowRunsResponseDto } from './dtos/workflow-runs-response.dto';
import { GetChartsCommand } from './usecases/get-charts/get-charts.command';
import { GetCharts } from './usecases/get-charts/get-charts.usecase';
import { GetRequestCommand } from './usecases/get-request/get-request.command';
import { GetRequest } from './usecases/get-request/get-request.usecase';
import { GetRequestsCommand } from './usecases/get-requests/get-requests.command';
import { GetRequests } from './usecases/get-requests/get-requests.usecase';
import { GetWorkflowRunCommand } from './usecases/get-workflow-run/get-workflow-run.command';
import { GetWorkflowRun } from './usecases/get-workflow-run/get-workflow-run.usecase';
import { GetWorkflowRunsCommand } from './usecases/get-workflow-runs/get-workflow-runs.command';
import { GetWorkflowRuns } from './usecases/get-workflow-runs/get-workflow-runs.usecase';

@Controller('/activity')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
export class ActivityController {
  constructor(
    private getRequestsUsecase: GetRequests,
    private getWorkflowRunsUsecase: GetWorkflowRuns,
    private getWorkflowRunUsecase: GetWorkflowRun,
    private getChartsUsecase: GetCharts,
    private getRequestUsecase: GetRequest
  ) {}

  @Get('requests')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  @ExternalApiAccessible()
  async getLogs(@UserSession() user: UserSessionData, @Query() query: GetRequestsDto): Promise<GetRequestsResponseDto> {
    return this.getRequestsUsecase.execute(
      GetRequestsCommand.create({
        ...query,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        createdGte: query.createdGte,
      })
    );
  }

  @Get('requests/:requestId')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  @ExternalApiAccessible()
  async getRequestTraces(@UserSession() user, @Param('requestId') requestId: string): Promise<GetRequestResponseDto> {
    return this.getRequestUsecase.execute(
      GetRequestCommand.create({
        requestId,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );
  }

  @Get('workflow-runs')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  async getWorkflowRuns(
    @UserSession() user: UserSessionData,
    @Query() query: GetWorkflowRunsRequestDto
  ): Promise<GetWorkflowRunsResponseDto> {
    return this.getWorkflowRunsUsecase.execute(
      GetWorkflowRunsCommand.create({
        ...query,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
      })
    );
  }

  @Get('workflow-runs/:workflowRunId')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  async getWorkflowRun(
    @UserSession() user: UserSessionData,
    @Param('workflowRunId') workflowRunId: string
  ): Promise<GetWorkflowRunResponseDto> {
    return this.getWorkflowRunUsecase.execute(
      GetWorkflowRunCommand.create({
        workflowRunId,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
      })
    );
  }

  @Get('charts')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  @ExternalApiAccessible()
  async getCharts(
    @UserSession() user: UserSessionData,
    @Query() query: GetChartsRequestDto
  ): Promise<GetChartsResponseDto> {
    return this.getChartsUsecase.execute(
      GetChartsCommand.create({
        ...query,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );
  }
}

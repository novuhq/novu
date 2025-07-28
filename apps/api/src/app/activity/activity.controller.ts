import { ClassSerializerInterceptor, Controller, Get, Query, UseInterceptors, Param } from '@nestjs/common';
import { ExternalApiAccessible, RequirePermissions, UserSession } from '@novu/application-generic';
import { PermissionsEnum } from '@novu/shared';
import { GetRequests } from './usecases/get-requests/get-requests.usecase';
import { GetRequestsCommand } from './usecases/get-requests/get-requests.command';
import { GetWorkflowRuns } from './usecases/get-workflow-runs/get-workflow-runs.usecase';
import { GetWorkflowRunsCommand } from './usecases/get-workflow-runs/get-workflow-runs.command';
import { GetWorkflowRun } from './usecases/get-workflow-run/get-workflow-run.usecase';
import { GetWorkflowRunCommand } from './usecases/get-workflow-run/get-workflow-run.command';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetRequestsDto } from './dtos/get-requests.dto';
import { GetRequestsResponseDto } from './dtos/get-requests.response.dto';
import { GetWorkflowRunsRequestDto } from './dtos/workflow-runs-request.dto';
import { GetWorkflowRunsResponseDto } from './dtos/workflow-runs-response.dto';
import { GetWorkflowRunResponseDto } from './dtos/workflow-run-response.dto';

@Controller('/activity')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
export class ActivityController {
  constructor(
    private getRequestsUsecase: GetRequests,
    private getWorkflowRunsUsecase: GetWorkflowRuns,
    private getWorkflowRunUsecase: GetWorkflowRun
  ) {}

  @Get('requests')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  @ExternalApiAccessible()
  async getLogs(
    @UserSession() user,
    @Query()
    query: GetRequestsDto
  ): Promise<GetRequestsResponseDto> {
    return this.getRequestsUsecase.execute(
      GetRequestsCommand.create({
        ...query,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        createdGte: query.createdGte,
      })
    );
  }

  @Get('workflow-runs')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  async getWorkflowRuns(
    @UserSession() user,
    @Query()
    query: GetWorkflowRunsRequestDto
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
    @UserSession() user,
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
}

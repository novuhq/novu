import { ClassSerializerInterceptor, HttpStatus, Patch } from '@nestjs/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common/decorators';
import { ApiBody, ApiExcludeEndpoint, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ExternalApiAccessible,
  UserSession,
  RequirePermissions,
  ParseSlugEnvironmentIdPipe,
  ParseSlugIdPipe,
} from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  DirectionEnum,
  UserSessionData,
  ResourceOriginEnum,
  PermissionsEnum,
} from '@novu/shared';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import {
  BuildStepDataCommand,
  BuildStepDataUsecase,
  BuildWorkflowTestDataUseCase,
  DuplicateWorkflowCommand,
  DuplicateWorkflowUseCase,
  GetWorkflowCommand,
  GetWorkflowUseCase,
  ListWorkflowsCommand,
  ListWorkflowsUseCase,
  PreviewCommand,
  PreviewUsecase,
  SyncToEnvironmentCommand,
  SyncToEnvironmentUseCase,
  UpsertWorkflowCommand,
  UpsertWorkflowUseCase,
  WorkflowTestDataCommand,
  UpsertStepDataCommand,
} from './usecases';
import { PatchWorkflowCommand, PatchWorkflowUsecase } from './usecases/patch-workflow';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import {
  CreateWorkflowDto,
  DuplicateWorkflowDto,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  GetListQueryParamsDto,
  ListWorkflowResponse,
  PatchWorkflowDto,
  StepResponseDto,
  SyncWorkflowDto,
  UpdateWorkflowDto,
  WorkflowResponseDto,
  WorkflowTestDataResponseDto,
  StepUpsertDto,
} from './dtos';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { DeleteWorkflowCommand } from '../workflows-v1/usecases/delete-workflow/delete-workflow.command';
import { DeleteWorkflowUseCase } from '../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller({ path: `/workflows`, version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Workflows')
export class WorkflowController {
  constructor(
    private upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private listWorkflowsUseCase: ListWorkflowsUseCase,
    private deleteWorkflowUsecase: DeleteWorkflowUseCase,
    private syncToEnvironmentUseCase: SyncToEnvironmentUseCase,
    private previewUsecase: PreviewUsecase,
    private buildWorkflowTestDataUseCase: BuildWorkflowTestDataUseCase,
    private buildStepDataUsecase: BuildStepDataUsecase,
    private patchWorkflowUsecase: PatchWorkflowUsecase,
    private duplicateWorkflowUseCase: DuplicateWorkflowUseCase
  ) {}

  @Post('')
  @ApiOperation({
    summary: 'Create a workflow',
    description: 'Creates a new workflow in the Novu Cloud environment',
  })
  @ExternalApiAccessible()
  @ApiBody({ type: CreateWorkflowDto, description: 'Workflow creation details' })
  @ApiResponse(WorkflowResponseDto, 201)
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async create(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Body() createWorkflowDto: CreateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    const upsertSteps: UpsertStepDataCommand[] = createWorkflowDto.steps.map((step: StepUpsertDto) => ({
      ...step,
      controlValues: (step.controlValues as Record<string, unknown> | null | undefined) ?? null,
    }));

    return this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: {
          ...createWorkflowDto,
          steps: upsertSteps,
          origin: ResourceOriginEnum.NOVU_CLOUD,
        },
        user,
      })
    );
  }

  @Put(':workflowId/sync')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Sync a workflow',
    description: 'Synchronizes a workflow to the target environment',
  })
  @ApiBody({ type: SyncWorkflowDto, description: 'Sync workflow details' })
  @ApiResponse(WorkflowResponseDto)
  @SdkMethodName('sync')
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async sync(
    @UserSession() user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string,
    @Body() syncWorkflowDto: SyncWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return this.syncToEnvironmentUseCase.execute(
      SyncToEnvironmentCommand.create({
        user,
        workflowIdOrInternalId,
        targetEnvironmentId: syncWorkflowDto.targetEnvironmentId,
      })
    );
  }

  @Put(':workflowId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Update a workflow',
    description: 'Updates the details of an existing workflow, here **workflowId** is the identifier of the workflow',
  })
  @ApiBody({ type: UpdateWorkflowDto, description: 'Workflow update details' })
  @ApiResponse(WorkflowResponseDto)
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async update(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    const upsertSteps: UpsertStepDataCommand[] = updateWorkflowDto.steps.map((step: StepUpsertDto) => ({
      ...step,
      controlValues: (step.controlValues as Record<string, unknown> | null | undefined) ?? null,
    }));

    return await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: {
          ...updateWorkflowDto,
          steps: upsertSteps,
        },
        user,
        workflowIdOrInternalId,
      })
    );
  }

  @Get(':workflowId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve a workflow',
    description: 'Fetches details of a specific workflow by its unique identifier **workflowId**',
  })
  @ApiResponse(WorkflowResponseDto)
  @ApiQuery({
    name: 'environmentId',
    type: String,
    required: false,
  })
  @SdkMethodName('get')
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async getWorkflow(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string,
    @Query('environmentId') environmentId?: string
  ): Promise<WorkflowResponseDto> {
    return this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        workflowIdOrInternalId,
        user: {
          ...user,
          environmentId: environmentId || user.environmentId,
        },
      })
    );
  }

  @Delete(':workflowId')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a workflow',
    description: 'Removes a specific workflow by its unique identifier **workflowId**',
  })
  @SdkMethodName('delete')
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async removeWorkflow(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string
  ) {
    await this.deleteWorkflowUsecase.execute(
      DeleteWorkflowCommand.create({
        workflowIdOrInternalId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'List all workflows',
    description: 'Retrieves a list of workflows with optional filtering and pagination',
  })
  @ApiResponse(ListWorkflowResponse)
  @SdkMethodName('list')
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async searchWorkflows(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Query() query: GetListQueryParamsDto
  ): Promise<ListWorkflowResponse> {
    return this.listWorkflowsUseCase.execute(
      ListWorkflowsCommand.create({
        offset: Number(query.offset || '0'),
        limit: Number(query.limit || '50'),
        orderDirection: query.orderDirection ?? DirectionEnum.DESC,
        orderBy: query.orderBy ?? 'createdAt',
        searchQuery: query.query,
        tags: query.tags,
        status: query.status,
        user,
      })
    );
  }

  @Post(':workflowId/duplicate')
  @ApiOperation({
    summary: 'Duplicate a workflow',
    description:
      'Duplicates a workflow by its unique identifier **workflowId**. This will create a new workflow with the same steps and settings.',
  })
  @ApiBody({ type: DuplicateWorkflowDto })
  @ApiResponse(WorkflowResponseDto, 201)
  @SdkMethodName('duplicate')
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async duplicateWorkflow(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string,
    @Body() duplicateWorkflowDto: DuplicateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return this.duplicateWorkflowUseCase.execute(
      DuplicateWorkflowCommand.create({
        user,
        workflowIdOrInternalId,
        overrides: duplicateWorkflowDto,
      })
    );
  }

  @Post('/:workflowId/step/:stepId/preview')
  @ApiOperation({
    summary: 'Generate step preview',
    description: 'Generates a preview for a specific workflow step by its unique identifier **stepId**',
  })
  @ApiBody({ type: GeneratePreviewRequestDto, description: 'Preview generation details' })
  @ApiResponse(GeneratePreviewResponseDto, 201)
  @SdkGroupName('Workflows.Steps')
  @SdkMethodName('generatePreview')
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async generatePreview(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string,
    @Param('stepId', ParseSlugIdPipe) stepIdOrInternalId: string,
    @Body() generatePreviewRequestDto: GeneratePreviewRequestDto
  ): Promise<GeneratePreviewResponseDto> {
    return await this.previewUsecase.execute(
      PreviewCommand.create({
        user,
        workflowIdOrInternalId,
        stepIdOrInternalId,
        generatePreviewRequestDto,
      })
    );
  }

  @Get('/:workflowId/steps/:stepId')
  @ApiOperation({
    summary: 'Retrieve workflow step',
    description: 'Retrieves data for a specific step in a workflow',
  })
  @ApiResponse(StepResponseDto)
  @ExternalApiAccessible()
  @SdkGroupName('Workflows.Steps')
  @SdkMethodName('retrieve')
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async getWorkflowStepData(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string,
    @Param('stepId', ParseSlugIdPipe) stepIdOrInternalId: string
  ): Promise<StepResponseDto> {
    return await this.buildStepDataUsecase.execute(
      BuildStepDataCommand.create({ user, workflowIdOrInternalId, stepIdOrInternalId })
    );
  }

  @Patch('/:workflowId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Update a workflow',
    description: 'Partially updates a workflow by its unique identifier **workflowId**',
  })
  @ApiBody({ type: PatchWorkflowDto, description: 'Workflow patch details' })
  @ApiResponse(WorkflowResponseDto)
  @SdkMethodName('patch')
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async patchWorkflow(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string,
    @Body() patchWorkflowDto: PatchWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return await this.patchWorkflowUsecase.execute(
      PatchWorkflowCommand.create({ user, workflowIdOrInternalId, ...patchWorkflowDto })
    );
  }

  @Get('/:workflowId/test-data')
  @ApiOperation({
    summary: 'Retrieve workflow test data',
    description: 'Retrieves test data for a specific workflow by its unique identifier **workflowId**',
  })
  @ApiResponse(WorkflowTestDataResponseDto)
  @SdkMethodName('getTestData')
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @ApiExcludeEndpoint()
  async getWorkflowTestData(
    @UserSession() user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string
  ): Promise<WorkflowTestDataResponseDto> {
    return this.buildWorkflowTestDataUseCase.execute(
      WorkflowTestDataCommand.create({
        workflowIdOrInternalId,
        user,
      })
    );
  }
}

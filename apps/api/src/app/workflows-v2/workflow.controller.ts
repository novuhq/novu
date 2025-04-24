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
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  DeleteWorkflowCommand,
  DeleteWorkflowUseCase,
  ExternalApiAccessible,
  UserSession,
} from '@novu/application-generic';
import { DirectionEnum, UserSessionData, WorkflowOriginEnum } from '@novu/shared';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { ParseSlugEnvironmentIdPipe } from './pipes/parse-slug-env-id.pipe';
import { ParseSlugIdPipe } from './pipes/parse-slug-id.pipe';
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
} from './dtos';

@ApiCommonResponses()
@Controller({ path: `/workflows`, version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
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
    summary: 'Create a new workflow',
    description: 'Creates a new workflow in the Novu Cloud environment',
  })
  @ApiBody({ type: CreateWorkflowDto, description: 'Workflow creation details' })
  @ApiResponse(WorkflowResponseDto, 201)
  @ExternalApiAccessible()
  async create(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Body() createWorkflowDto: CreateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: { ...createWorkflowDto, origin: WorkflowOriginEnum.NOVU_CLOUD },
        user,
      })
    );
  }

  @Put(':workflowId/sync')
  @ApiOperation({
    summary: 'Sync workflow to another environment',
    description: 'Synchronizes a workflow to a target environment',
  })
  @ApiBody({ type: SyncWorkflowDto, description: 'Sync workflow details' })
  @ApiResponse(WorkflowResponseDto)
  @SdkMethodName('sync')
  @ExternalApiAccessible()
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
    summary: 'Update an existing workflow',
    description: 'Updates the details of an existing workflow',
  })
  @ApiBody({ type: UpdateWorkflowDto, description: 'Workflow update details' })
  @ApiResponse(WorkflowResponseDto)
  async update(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('workflowId', ParseSlugIdPipe) workflowIdOrInternalId: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: updateWorkflowDto,
        user,
        workflowIdOrInternalId,
      })
    );
  }

  @Get(':workflowId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve a workflow',
    description: 'Fetches details of a specific workflow',
  })
  @ApiResponse(WorkflowResponseDto)
  @ApiQuery({
    name: 'environmentId',
    type: String,
    required: false,
  })
  @SdkMethodName('retrieve')
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
    description: 'Removes a specific workflow',
  })
  @SdkMethodName('delete')
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
  @ApiOperation({
    summary: 'Search workflows',
    description: 'Retrieves a list of workflows with optional filtering and pagination',
  })
  @ApiResponse(ListWorkflowResponse)
  @SdkMethodName('search')
  @ExternalApiAccessible()
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
        user,
      })
    );
  }

  @Post(':workflowId/duplicate')
  @ApiOperation({ summary: 'Duplicate a workflow' }) // Summary for the endpoint
  @ApiBody({ type: DuplicateWorkflowDto }) // Documenting the request body
  @ApiResponse(WorkflowResponseDto, 201)
  @SdkMethodName('duplicate')
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
    summary: 'Generate preview',
    description: 'Generates a preview for a specific workflow step',
  })
  @ApiBody({ type: GeneratePreviewRequestDto, description: 'Preview generation details' })
  @ApiResponse(GeneratePreviewResponseDto, 201)
  @SdkGroupName('Workflows.Steps')
  @SdkMethodName('generatePreview')
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
    summary: 'Get workflow step data',
    description: 'Retrieves data for a specific step in a workflow',
  })
  @ApiResponse(StepResponseDto)
  @SdkGroupName('Workflows.Steps')
  @SdkMethodName('retrieve')
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
  @ApiOperation({
    summary: 'Patch workflow',
    description: 'Partially updates a workflow',
  })
  @ApiBody({ type: PatchWorkflowDto, description: 'Workflow patch details' })
  @ApiResponse(WorkflowResponseDto)
  @SdkMethodName('patch')
  @ExternalApiAccessible()
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
    summary: 'Get workflow test data',
    description: 'Retrieves test data for a specific workflow',
  })
  @ApiResponse(WorkflowTestDataResponseDto)
  @SdkMethodName('getTestData')
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

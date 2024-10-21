import { ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible, UserAuthGuard, UserSession } from '@novu/application-generic';
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common/decorators';
import { ClassSerializerInterceptor, HttpStatus } from '@nestjs/common';
import {
  CreateWorkflowDto,
  DirectionEnum,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  GetListQueryParams,
  ListWorkflowResponse,
  UpdateWorkflowDto,
  UserSessionData,
  WorkflowResponseDto,
} from '@novu/shared';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { GetWorkflowCommand } from './usecases/get-workflow/get-workflow.command';
import { UpsertWorkflowUseCase } from './usecases/upsert-workflow/upsert-workflow.usecase';
import { UpsertWorkflowCommand } from './usecases/upsert-workflow/upsert-workflow.command';
import { GetWorkflowUseCase } from './usecases/get-workflow/get-workflow.usecase';
import { ListWorkflowsUseCase } from './usecases/list-workflows/list-workflow.usecase';
import { ListWorkflowsCommand } from './usecases/list-workflows/list-workflows.command';
import { DeleteWorkflowUseCase } from './usecases/delete-workflow/delete-workflow.usecase';
import { DeleteWorkflowCommand } from './usecases/delete-workflow/delete-workflow.command';
import { GeneratePreviewUsecase } from './usecases/generate-preview/generate-preview-usecase';
import { GeneratePreviewCommand } from './usecases/generate-preview/generate-preview-command';

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
    private generatePreviewUseCase: GeneratePreviewUsecase
  ) {}

  @Post('')
  @UseGuards(UserAuthGuard)
  async create(
    @UserSession() user: UserSessionData,
    @Body() createWorkflowDto: CreateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: createWorkflowDto,
        user,
      })
    );
  }

  @Put(':workflowId')
  @UseGuards(UserAuthGuard)
  async update(
    @UserSession() user: UserSessionData,
    @Param('workflowId') workflowId: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: updateWorkflowDto,
        user,
        identifierOrInternalId: workflowId,
      })
    );
  }

  @Get(':workflowId')
  @UseGuards(UserAuthGuard)
  async getWorkflow(
    @UserSession() user: UserSessionData,
    @Param('workflowId') workflowId: string
  ): Promise<WorkflowResponseDto> {
    return this.getWorkflowUseCase.execute(GetWorkflowCommand.create({ identifierOrInternalId: workflowId, user }));
  }

  @Delete(':workflowId')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWorkflow(@UserSession() user: UserSessionData, @Param('workflowId') workflowId: string) {
    await this.deleteWorkflowUsecase.execute(
      DeleteWorkflowCommand.create({ identifierOrInternalId: workflowId, user })
    );
  }

  @Get('')
  @UseGuards(UserAuthGuard)
  async searchWorkflows(
    @UserSession() user: UserSessionData,
    @Query() query: GetListQueryParams
  ): Promise<ListWorkflowResponse> {
    return this.listWorkflowsUseCase.execute(
      ListWorkflowsCommand.create({
        offset: Number(query.offset || '0'),
        limit: Number(query.limit || '50'),
        orderDirection: query.orderDirection ?? DirectionEnum.DESC,
        orderByField: query.orderByField ?? 'createdAt',
        searchQuery: query.query,
        user,
      })
    );
  }

  @Post('/:workflowId/step/:stepUuid/preview')
  @UseGuards(UserAuthGuard)
  async generatePreview(
    @UserSession() user: UserSessionData,
    @Param('workflowId') workflowId: string,
    @Param('stepUuid') stepUuid: string,
    @Body() generatePreviewRequestDto: GeneratePreviewRequestDto
  ): Promise<GeneratePreviewResponseDto> {
    return await this.generatePreviewUseCase.execute(
      GeneratePreviewCommand.create({ user, workflowId, stepUuid, generatePreviewRequestDto })
    );
  }
}

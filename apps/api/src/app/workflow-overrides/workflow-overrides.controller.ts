import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { Roles } from '../auth/framework/roles.decorator';
import { ApiCommonResponses, ApiResponse, ApiOkResponse } from '../shared/framework/response.decorator';
import { DataBooleanDto } from '../shared/dtos/data-wrapper-dto';
import { CreateWorkflowOverride } from './usecases/create-workflow-override/create-workflow-override.usecase';
import { CreateWorkflowOverrideCommand } from './usecases/create-workflow-override/create-workflow-override.command';
import { UpdateWorkflowOverrideCommand } from './usecases/update-workflow-override/update-workflow-override.command';
import { UpdateWorkflowOverride } from './usecases/update-workflow-override/update-workflow-override.usecase';
import { GetWorkflowOverride } from './usecases/get-workflow-override/get-workflow-override.usecase';
import { GetWorkflowOverrideCommand } from './usecases/get-workflow-override/get-workflow-override.command';
import { DeleteWorkflowOverride } from './usecases/delete-workflow-override/delete-workflow-override.usecase';
import { DeleteWorkflowOverrideCommand } from './usecases/delete-workflow-override/delete-workflow-override.command';
import { GetWorkflowOverridesCommand } from './usecases/get-workflow-overrides/get-workflow-overrides.command';
import { GetWorkflowOverrides } from './usecases/get-workflow-overrides/get-workflow-overrides.usecase';
import {
  CreateWorkflowOverrideRequestDto,
  CreateWorkflowOverrideResponseDto,
  GetWorkflowOverrideResponseDto,
  GetWorkflowOverridesRequestDto,
  GetWorkflowOverridesResponseDto,
  UpdateWorkflowOverrideRequestDto,
  UpdateWorkflowOverrideResponseDto,
} from './dto';
import { GetWorkflowOverrideById } from './usecases/get-workflow-override-by-id/get-workflow-override-by-id.usecase';
import { GetWorkflowOverrideByIdCommand } from './usecases/get-workflow-override-by-id/get-workflow-override-by-id.command';
import { UpdateWorkflowOverrideByIdCommand } from './usecases/update-workflow-override-by-id/update-workflow-override-by-id.command';
import { UpdateWorkflowOverrideById } from './usecases/update-workflow-override-by-id/update-workflow-override-by-id.usecase';

@ApiCommonResponses()
@Controller('/workflow-overrides')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiTags('Workflows-Overrides')
export class WorkflowOverridesController {
  constructor(
    private createWorkflowOverrideUsecase: CreateWorkflowOverride,
    private updateWorkflowOverrideUsecase: UpdateWorkflowOverride,
    private updateWorkflowOverrideByIdUsecase: UpdateWorkflowOverrideById,
    private getWorkflowOverrideUsecase: GetWorkflowOverride,
    private getWorkflowOverrideByIdUsecase: GetWorkflowOverrideById,
    private deleteWorkflowOverrideUsecase: DeleteWorkflowOverride,
    private getWorkflowOverridesUsecase: GetWorkflowOverrides
  ) {}

  @Post('/')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(CreateWorkflowOverrideResponseDto)
  @ApiOperation({
    summary: 'Create workflow override',
  })
  @ExternalApiAccessible()
  createWorkflowOverride(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateWorkflowOverrideRequestDto
  ): Promise<CreateWorkflowOverrideResponseDto> {
    return this.createWorkflowOverrideUsecase.execute(
      CreateWorkflowOverrideCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        active: body.active,
        preferenceSettings: body.preferenceSettings,
        _tenantId: body.tenantId,
        _workflowId: body.workflowId,
      })
    );
  }

  @Put('/:overrideId')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(UpdateWorkflowOverrideResponseDto)
  @ApiOperation({
    summary: 'Update workflow override by id',
  })
  @ExternalApiAccessible()
  updateWorkflowOverrideById(
    @UserSession() user: IJwtPayload,
    @Body() body: UpdateWorkflowOverrideRequestDto,
    @Param('overrideId') overrideId: string
  ): Promise<UpdateWorkflowOverrideResponseDto> {
    return this.updateWorkflowOverrideByIdUsecase.execute(
      UpdateWorkflowOverrideByIdCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        active: body.active,
        preferenceSettings: body.preferenceSettings,
        overrideId: overrideId,
      })
    );
  }

  @Put('/workflows/:workflowId/tenants/:tenantId')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(UpdateWorkflowOverrideResponseDto)
  @ApiOperation({
    summary: 'Update workflow override',
  })
  @ExternalApiAccessible()
  updateWorkflowOverride(
    @UserSession() user: IJwtPayload,
    @Body() body: UpdateWorkflowOverrideRequestDto,
    @Param('workflowId') workflowId: string,
    @Param('tenantId') tenantId: string
  ): Promise<UpdateWorkflowOverrideResponseDto> {
    return this.updateWorkflowOverrideUsecase.execute(
      UpdateWorkflowOverrideCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        active: body.active,
        preferenceSettings: body.preferenceSettings,
        _tenantId: tenantId,
        _workflowId: workflowId,
      })
    );
  }

  @Get('/:overrideId')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(GetWorkflowOverrideResponseDto)
  @ApiOperation({
    summary: 'Get workflow override by id',
  })
  @ExternalApiAccessible()
  getWorkflowOverrideById(
    @UserSession() user: IJwtPayload,
    @Param('overrideId') overrideId: string
  ): Promise<GetWorkflowOverrideResponseDto> {
    return this.getWorkflowOverrideByIdUsecase.execute(
      GetWorkflowOverrideByIdCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        overrideId: overrideId,
      })
    );
  }

  @Get('/workflows/:workflowId/tenants/:tenantId')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(GetWorkflowOverrideResponseDto)
  @ApiOperation({
    summary: 'Get workflow override',
  })
  @ExternalApiAccessible()
  getWorkflowOverride(
    @UserSession() user: IJwtPayload,
    @Param('workflowId') workflowId: string,
    @Param('tenantId') tenantId: string
  ): Promise<GetWorkflowOverrideResponseDto> {
    return this.getWorkflowOverrideUsecase.execute(
      GetWorkflowOverrideCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        _tenantId: tenantId,
        _workflowId: workflowId,
      })
    );
  }

  @Delete('/:overrideId')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOkResponse({
    type: DataBooleanDto,
  })
  @ApiOperation({
    summary: 'Delete workflow override',
  })
  @ExternalApiAccessible()
  deleteWorkflowOverride(@UserSession() user: IJwtPayload, @Param('overrideId') overrideId: string): Promise<boolean> {
    return this.deleteWorkflowOverrideUsecase.execute(
      DeleteWorkflowOverrideCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        _id: overrideId,
      })
    );
  }

  @Get('/')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(GetWorkflowOverridesResponseDto)
  @ApiOperation({
    summary: 'Get workflow overrides',
  })
  @ExternalApiAccessible()
  getWorkflowOverrides(
    @UserSession() user: IJwtPayload,
    @Query() query: GetWorkflowOverridesRequestDto
  ): Promise<GetWorkflowOverridesResponseDto> {
    return this.getWorkflowOverridesUsecase.execute(
      GetWorkflowOverridesCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        page: query.page,
        limit: query.limit,
      })
    );
  }
}

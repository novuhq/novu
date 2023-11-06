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
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { Roles } from '../auth/framework/roles.decorator';
import { ApiResponse } from '../shared/framework/response.decorator';
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

@Controller('/workflow-overrides')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Workflows-Overrides')
export class WorkflowOverridesController {
  constructor(
    private createWorkflowOverrideUsecase: CreateWorkflowOverride,
    private updateWorkflowOverrideUsecase: UpdateWorkflowOverride,
    private getWorkflowOverrideUsecase: GetWorkflowOverride,
    private deleteWorkflowOverrideUsecase: DeleteWorkflowOverride,
    private getWorkflowOverridesUsecase: GetWorkflowOverrides
  ) {}

  @Post('/')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(CreateWorkflowOverrideResponseDto)
  @ApiOperation({
    summary: 'Create workflow override',
    description:
      'In order to create workflow override please make sure to identify the workflow by triggerIdentifier or _workflowId, and tenant by tenantIdentifier',
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
        triggerIdentifier: body.triggerIdentifier,
        tenantIdentifier: body.tenantIdentifier,
        _workflowId: body._workflowId,
      })
    );
  }

  @Put('/workflows/:workflowId/tenants/:tenantIdentifier')
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
    @Param('tenantIdentifier') tenantIdentifier: string
  ): Promise<UpdateWorkflowOverrideResponseDto> {
    return this.updateWorkflowOverrideUsecase.execute(
      UpdateWorkflowOverrideCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        active: body.active,
        preferenceSettings: body.preferenceSettings,
        tenantIdentifier: tenantIdentifier,
        _workflowId: workflowId,
      })
    );
  }

  @Get('/workflows/:workflowId/tenants/:tenantIdentifier')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(GetWorkflowOverrideResponseDto)
  @ApiOperation({
    summary: 'Get workflow override',
  })
  @ExternalApiAccessible()
  getWorkflowOverride(
    @UserSession() user: IJwtPayload,
    @Param('workflowId') workflowId: string,
    @Param('tenantIdentifier') tenantIdentifier: string
  ): Promise<GetWorkflowOverrideResponseDto> {
    return this.getWorkflowOverrideUsecase.execute(
      GetWorkflowOverrideCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        tenantIdentifier: tenantIdentifier,
        _workflowId: workflowId,
      })
    );
  }

  @Delete('/:workflowOverrideId')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOkResponse({
    type: DataBooleanDto,
  })
  @ApiOperation({
    summary: 'Delete workflow override',
  })
  @ExternalApiAccessible()
  deleteWorkflowOverride(
    @UserSession() user: IJwtPayload,
    @Param('workflowOverrideId') workflowOverrideId: string
  ): Promise<boolean> {
    return this.deleteWorkflowOverrideUsecase.execute(
      DeleteWorkflowOverrideCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        _id: workflowOverrideId,
      })
    );
  }

  @Get('/workflows/:workflowId')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(GetWorkflowOverridesResponseDto)
  @ApiOperation({
    summary: 'Get workflow overrides',
  })
  @ExternalApiAccessible()
  getWorkflowOverrides(
    @UserSession() user: IJwtPayload,
    @Param('workflowId') workflowId: string,
    @Query() query: GetWorkflowOverridesRequestDto
  ): Promise<GetWorkflowOverridesResponseDto> {
    return this.getWorkflowOverridesUsecase.execute(
      GetWorkflowOverridesCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        page: query.page ? query.page : 0,
        limit: query.limit ? query.limit : 10,
        _workflowId: workflowId,
      })
    );
  }
}

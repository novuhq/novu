import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, ContextType, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  CreateContextRequestDto,
  GetContextResponseDto,
  ListContextsQueryDto,
  ListContextsResponseDto,
  mapContextEntityToDto,
  UpdateContextRequestDto,
} from './dtos';
import { CreateContextCommand } from './usecases/create-context/create-context.command';
import { CreateContext } from './usecases/create-context/create-context.usecase';
import { DeleteContext, DeleteContextCommand } from './usecases/delete-context';
import { GetContext, GetContextCommand } from './usecases/get-context';
import { ListContexts, ListContextsCommand } from './usecases/list-contexts';
import { UpdateContextCommand } from './usecases/update-context/update-context.command';
import { UpdateContext } from './usecases/update-context/update-context.usecase';

@Controller({ path: '/contexts', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ThrottlerCategory(ApiRateLimitCategoryEnum.GLOBAL)
@RequireAuthentication()
@ApiTags('Contexts')
@ApiCommonResponses()
export class ContextsController {
  constructor(
    private createContextUsecase: CreateContext,
    private updateContextUsecase: UpdateContext,
    private getContextUsecase: GetContext,
    private listContextsUsecase: ListContexts,
    private deleteContextUsecase: DeleteContext
  ) {}

  @Post('')
  @ApiResponse(GetContextResponseDto, 201)
  @ApiOperation({
    summary: 'Create a context',
    description: `Create a new context with the specified type, id, and data. Returns 409 if context already exists.
      **type** and **id** are required fields, **data** is optional, if the context already exists, it returns the 409 response`,
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async createContext(
    @UserSession() user: UserSessionData,
    @Body() body: CreateContextRequestDto
  ): Promise<GetContextResponseDto> {
    const entity = await this.createContextUsecase.execute(
      CreateContextCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        type: body.type,
        id: body.id,
        data: body.data,
      })
    );

    return mapContextEntityToDto(entity);
  }

  @Patch('/:type/:id')
  @ApiParam({ name: 'type', type: String, description: 'Context type' })
  @ApiParam({ name: 'id', type: String, description: 'Context ID' })
  @ApiResponse(GetContextResponseDto, 200)
  @ApiOperation({
    summary: 'Update a context',
    description: `Update the data of an existing context.
      **type** and **id** are required fields, **data** is required. Only the data field is updated, the rest of the context is not affected.
      If the context does not exist, it returns the 404 response`,
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async updateContext(
    @UserSession() user: UserSessionData,
    @Param('type') type: ContextType,
    @Param('id') id: string,
    @Body() body: UpdateContextRequestDto
  ): Promise<GetContextResponseDto> {
    const entity = await this.updateContextUsecase.execute(
      UpdateContextCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        type,
        id,
        data: body.data,
      })
    );

    return mapContextEntityToDto(entity);
  }

  @Get('')
  @ApiResponse(ListContextsResponseDto)
  @ApiOperation({
    summary: 'List all contexts',
    description: `Retrieve a paginated list of all contexts, optionally filtered by type and key pattern.
      **type** and **id** are optional fields, if provided, only contexts with the matching type and id will be returned.
      **search** is an optional field, if provided, only contexts with the matching key pattern will be returned.
      Checkout all possible parameters in the query section below for more details`,
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @ExternalApiAccessible()
  async listContexts(
    @UserSession() user: UserSessionData,
    @Query() query: ListContextsQueryDto
  ): Promise<ListContextsResponseDto> {
    const result = await this.listContextsUsecase.execute(
      ListContextsCommand.create({
        user,
        limit: query.limit || 10,
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection,
        orderBy: query.orderBy || 'createdAt',
        includeCursor: query.includeCursor,
        type: query.type,
        id: query.id,
        search: query.search,
      })
    );

    return {
      data: result.data.map(mapContextEntityToDto),
      next: result.next,
      previous: result.previous,
      totalCount: result.totalCount!,
      totalCountCapped: result.totalCountCapped!,
    };
  }

  @Get('/:type/:id')
  @ApiParam({ name: 'type', type: String, description: 'Context type' })
  @ApiParam({ name: 'id', type: String, description: 'Context ID' })
  @ApiResponse(GetContextResponseDto, 200)
  @ApiOperation({
    summary: 'Retrieve a context',
    description: `Retrieve a specific context by its type and id.
      **type** and **id** are required fields, if the context does not exist, it returns the 404 response`,
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @ExternalApiAccessible()
  async getContext(
    @UserSession() user: UserSessionData,
    @Param('type') type: ContextType,
    @Param('id') id: string
  ): Promise<GetContextResponseDto> {
    const entity = await this.getContextUsecase.execute(
      GetContextCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        type,
        id,
      })
    );

    return mapContextEntityToDto(entity);
  }

  @Delete('/:type/:id')
  @ApiParam({ name: 'type', type: String, description: 'Context type' })
  @ApiParam({ name: 'id', type: String, description: 'Context ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a context',
    description: `Delete a context by its type and id.
      **type** and **id** are required fields, if the context does not exist, it returns the 404 response`,
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async deleteContext(
    @UserSession() user: UserSessionData,
    @Param('type') type: ContextType,
    @Param('id') id: string
  ): Promise<void> {
    return this.deleteContextUsecase.execute(
      DeleteContextCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        type,
        id,
      })
    );
  }
}

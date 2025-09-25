import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiExcludeController } from '@nestjs/swagger/dist/decorators/api-exclude-controller.decorator';
import { FeatureFlagsService } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, ContextType, FeatureFlagsKeysEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  GetContextResponseDto,
  ListContextsQueryDto,
  ListContextsResponseDto,
  mapContextEntityToDto,
  UpsertContextRequestDto,
} from './dtos';
import { DeleteContext, DeleteContextCommand } from './usecases/delete-context';
import { GetContext, GetContextCommand } from './usecases/get-context';
import { ListContexts, ListContextsCommand } from './usecases/list-contexts';
import { UpsertContext, UpsertContextCommand } from './usecases/upsert-context';

@Controller({ path: '/contexts', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ThrottlerCategory(ApiRateLimitCategoryEnum.GLOBAL)
@RequireAuthentication()
@ApiTags('Contexts')
@ApiCommonResponses()
@ApiExcludeController()
export class ContextsController {
  constructor(
    private upsertContextUsecase: UpsertContext,
    private getContextUsecase: GetContext,
    private listContextsUsecase: ListContexts,
    private deleteContextUsecase: DeleteContext,
    private featureFlagsService: FeatureFlagsService
  ) {}

  private async checkFeatureEnabled(user: UserSessionData) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
      user: { _id: user._id },
    });

    if (!isEnabled) {
      throw new ForbiddenException('Context feature is not enabled');
    }
  }

  @Post('')
  @ApiResponse(GetContextResponseDto, 201)
  @ApiOperation({
    summary: 'Upsert contexts',
    description:
      'Create a new context with the specified type, key, and data, or update an existing context data if it already exists',
  })
  @ExternalApiAccessible()
  async createContext(
    @UserSession() user: UserSessionData,
    @Body() body: UpsertContextRequestDto
  ): Promise<GetContextResponseDto[]> {
    await this.checkFeatureEnabled(user);

    const entities = await this.upsertContextUsecase.execute(
      UpsertContextCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        context: body.context,
      })
    );

    return entities.map(mapContextEntityToDto);
  }

  @Get('')
  @ApiResponse(ListContextsResponseDto)
  @ApiOperation({
    summary: 'List contexts',
    description: 'Retrieve a paginated list of contexts, optionally filtered by type and key pattern',
  })
  @ExternalApiAccessible()
  async listContexts(
    @UserSession() user: UserSessionData,
    @Query() query: ListContextsQueryDto
  ): Promise<ListContextsResponseDto> {
    await this.checkFeatureEnabled(user);

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
    };
  }

  @Get('/:type/:id')
  @ApiResponse(GetContextResponseDto, 200)
  @ApiOperation({
    summary: 'Get context by id',
    description: 'Retrieve a specific context by its type and id',
  })
  @ExternalApiAccessible()
  async getContext(
    @UserSession() user: UserSessionData,
    @Param('type') type: ContextType,
    @Param('id') id: string
  ): Promise<GetContextResponseDto> {
    await this.checkFeatureEnabled(user);

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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete context',
    description: 'Delete a context by its type and id',
  })
  @ExternalApiAccessible()
  async deleteContext(
    @UserSession() user: UserSessionData,
    @Param('type') type: ContextType,
    @Param('id') id: string
  ): Promise<void> {
    await this.checkFeatureEnabled(user);

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

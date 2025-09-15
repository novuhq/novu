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
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiExcludeController } from '@nestjs/swagger/dist/decorators/api-exclude-controller.decorator';
import { FeatureFlagsService } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, FeatureFlagsKeysEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  CreateContextRequestDto,
  GetContextResponseDto,
  GetContextsRequestDto,
  GetContextsResponseDto,
  UpdateContextRequestDto,
} from './dtos';
import { CreateContext, CreateContextCommand } from './usecases/create-context';
import { DeleteContext, DeleteContextCommand } from './usecases/delete-context';
import { GetContext, GetContextCommand } from './usecases/get-context';
import { GetContexts, GetContextsCommand } from './usecases/get-contexts';
import { UpdateContext, UpdateContextCommand } from './usecases/update-context';

@Controller('/contexts')
@UseInterceptors(ClassSerializerInterceptor)
@ThrottlerCategory(ApiRateLimitCategoryEnum.GLOBAL)
@RequireAuthentication()
@ApiTags('Contexts')
@ApiCommonResponses()
@ApiExcludeController()
export class ContextsController {
  constructor(
    private createContextUsecase: CreateContext,
    private getContextUsecase: GetContext,
    private getContextsUsecase: GetContexts,
    private updateContextUsecase: UpdateContext,
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
    summary: 'Create context',
    description: 'Create a new context with the specified type, key, and data',
  })
  @ExternalApiAccessible()
  async createContext(
    @UserSession() user: UserSessionData,
    @Body() body: CreateContextRequestDto
  ): Promise<GetContextResponseDto> {
    await this.checkFeatureEnabled(user);

    return this.createContextUsecase.execute(
      CreateContextCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        type: body.type,
        identifier: body.identifier,
        data: body.data,
      })
    );
  }

  @Get('')
  @ApiResponse(GetContextsResponseDto)
  @ApiOperation({
    summary: 'Get contexts',
    description: 'Retrieve a paginated list of contexts, optionally filtered by type and key pattern',
  })
  @ExternalApiAccessible()
  async getContexts(
    @UserSession() user: UserSessionData,
    @Query() query: GetContextsRequestDto
  ): Promise<GetContextsResponseDto> {
    await this.checkFeatureEnabled(user);

    return this.getContextsUsecase.execute(
      GetContextsCommand.create({
        user,
        limit: query.limit || 10,
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection,
        orderBy: query.orderBy || 'createdAt',
        includeCursor: query.includeCursor,
        type: query.type,
        identifier: query.identifier,
      })
    );
  }

  @Get('/:identifier')
  @ApiResponse(GetContextResponseDto, 200)
  @ApiOperation({
    summary: 'Get context by identifier',
    description: 'Retrieve a specific context by its identifier',
  })
  @ExternalApiAccessible()
  async getContext(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<GetContextResponseDto> {
    await this.checkFeatureEnabled(user);

    return this.getContextUsecase.execute(
      GetContextCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        identifier,
      })
    );
  }

  @Patch('/:identifier')
  @ApiResponse(GetContextResponseDto, 200)
  @ApiOperation({
    summary: 'Update context',
    description: 'Update the data of an existing context',
  })
  @ExternalApiAccessible()
  async updateContext(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateContextRequestDto
  ): Promise<GetContextResponseDto> {
    await this.checkFeatureEnabled(user);

    return this.updateContextUsecase.execute(
      UpdateContextCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        identifier,
        data: body.data,
      })
    );
  }

  @Delete('/:identifier')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete context',
    description: 'Delete a context by its identifier',
  })
  @ExternalApiAccessible()
  async deleteContext(@UserSession() user: UserSessionData, @Param('identifier') identifier: string): Promise<void> {
    await this.checkFeatureEnabled(user);

    return this.deleteContextUsecase.execute(
      DeleteContextCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        identifier,
      })
    );
  }
}

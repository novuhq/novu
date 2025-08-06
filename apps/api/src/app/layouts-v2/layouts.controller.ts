import { ClassSerializerInterceptor, HttpStatus } from '@nestjs/common';
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
import { ApiBody, ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ExternalApiAccessible,
  ParseSlugEnvironmentIdPipe,
  ParseSlugIdPipe,
  RequirePermissions,
  UserSession,
} from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, DirectionEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import {
  CreateLayoutDto,
  DuplicateLayoutDto,
  GetLayoutListQueryParamsDto,
  GetLayoutUsageResponseDto,
  LayoutResponseDto,
  ListLayoutResponseDto,
  UpdateLayoutDto,
} from './dtos';
import { GenerateLayoutPreviewResponseDto } from './dtos/generate-layout-preview-response.dto';
import { LayoutPreviewRequestDto } from './dtos/layout-preview-request.dto';
import { DeleteLayoutCommand, DeleteLayoutUseCase } from './usecases/delete-layout';
import { DuplicateLayoutCommand, DuplicateLayoutUseCase } from './usecases/duplicate-layout';
import { GetLayoutCommand, GetLayoutUseCase } from './usecases/get-layout';
import { GetLayoutUsageCommand, GetLayoutUsageUseCase } from './usecases/get-layout-usage';
import { ListLayoutsCommand, ListLayoutsUseCase } from './usecases/list-layouts';
import { PreviewLayoutCommand, PreviewLayoutUsecase } from './usecases/preview-layout';
import { UpsertLayout, UpsertLayoutCommand } from './usecases/upsert-layout';
import { EMPTY_LAYOUT } from './utils/layout-templates';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller({ path: `/layouts`, version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiExcludeController()
@ApiTags('Layouts')
export class LayoutsController {
  constructor(
    private upsertLayoutUseCase: UpsertLayout,
    private getLayoutUseCase: GetLayoutUseCase,
    private deleteLayoutUseCase: DeleteLayoutUseCase,
    private duplicateLayoutUseCase: DuplicateLayoutUseCase,
    private listLayoutsUseCase: ListLayoutsUseCase,
    private previewLayoutUsecase: PreviewLayoutUsecase,
    private getLayoutUsageUseCase: GetLayoutUsageUseCase
  ) {}

  @Post('')
  @ApiOperation({
    summary: 'Create a layout',
    description: 'Creates a new layout in the Novu Cloud environment',
  })
  @ExternalApiAccessible()
  @ApiBody({ type: CreateLayoutDto, description: 'Layout creation details' })
  @ApiResponse(LayoutResponseDto, 201)
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async create(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Body() createLayoutDto: CreateLayoutDto
  ): Promise<LayoutResponseDto> {
    return this.upsertLayoutUseCase.execute(
      UpsertLayoutCommand.create({
        layoutDto: {
          ...createLayoutDto,
          controlValues: {
            email: {
              body: JSON.stringify(EMPTY_LAYOUT),
              editorType: 'block',
            },
          },
        },
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Put(':layoutId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Update a layout',
    description: 'Updates the details of an existing layout, here **layoutId** is the identifier of the layout',
  })
  @ApiBody({ type: UpdateLayoutDto, description: 'Layout update details' })
  @ApiResponse(LayoutResponseDto)
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async update(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('layoutId', ParseSlugIdPipe) layoutIdOrInternalId: string,
    @Body() updateLayoutDto: UpdateLayoutDto
  ): Promise<LayoutResponseDto> {
    return this.upsertLayoutUseCase.execute(
      UpsertLayoutCommand.create({
        layoutDto: {
          ...updateLayoutDto,
        },
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        layoutIdOrInternalId,
      })
    );
  }

  @Get(':layoutId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve a layout',
    description: 'Fetches details of a specific layout by its unique identifier **layoutId**',
  })
  @ApiResponse(LayoutResponseDto)
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async get(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('layoutId', ParseSlugIdPipe) layoutIdOrInternalId: string
  ): Promise<LayoutResponseDto> {
    return this.getLayoutUseCase.execute(
      GetLayoutCommand.create({
        layoutIdOrInternalId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Delete(':layoutId')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a layout',
    description: 'Removes a specific layout by its unique identifier **layoutId**',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async delete(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('layoutId', ParseSlugIdPipe) layoutIdOrInternalId: string
  ) {
    await this.deleteLayoutUseCase.execute(
      DeleteLayoutCommand.create({
        layoutIdOrInternalId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post(':layoutId/duplicate')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Duplicate a layout',
    description:
      'Duplicates a layout by its unique identifier **layoutId**. This will create a new layout with the content of the original layout.',
  })
  @ApiBody({ type: DuplicateLayoutDto })
  @ApiResponse(LayoutResponseDto, 201)
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @SdkMethodName('duplicate')
  async duplicate(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('layoutId', ParseSlugIdPipe) layoutIdOrInternalId: string,
    @Body() duplicateLayoutDto: DuplicateLayoutDto
  ): Promise<LayoutResponseDto> {
    return this.duplicateLayoutUseCase.execute(
      DuplicateLayoutCommand.create({
        layoutIdOrInternalId,
        overrides: duplicateLayoutDto,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'List all layouts',
    description: 'Retrieves a list of layouts with optional filtering and pagination',
  })
  @ApiResponse(ListLayoutResponseDto)
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async list(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Query() query: GetLayoutListQueryParamsDto
  ): Promise<ListLayoutResponseDto> {
    return this.listLayoutsUseCase.execute(
      ListLayoutsCommand.create({
        offset: Number(query.offset || '0'),
        limit: Number(query.limit || '50'),
        orderDirection: query.orderDirection ?? DirectionEnum.DESC,
        orderBy: query.orderBy ?? 'createdAt',
        searchQuery: query.query,
        user,
      })
    );
  }

  @Post(':layoutId/preview')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Generate layout preview',
    description: 'Generates a preview for a layout by its unique identifier **layoutId**',
  })
  @ApiBody({ type: LayoutPreviewRequestDto, description: 'Layout preview generation details' })
  @ApiResponse(GenerateLayoutPreviewResponseDto, 201)
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @SdkMethodName('generatePreview')
  async generatePreview(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('layoutId', ParseSlugIdPipe) layoutIdOrInternalId: string,
    @Body() layoutPreviewRequestDto: LayoutPreviewRequestDto
  ): Promise<GenerateLayoutPreviewResponseDto> {
    return await this.previewLayoutUsecase.execute(
      PreviewLayoutCommand.create({
        user,
        layoutIdOrInternalId,
        layoutPreviewRequestDto,
      })
    );
  }

  @Get(':layoutId/usage')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Get layout usage',
    description:
      'Retrieves information about workflows that use the specified layout by its unique identifier **layoutId**',
  })
  @ApiResponse(GetLayoutUsageResponseDto)
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @SdkMethodName('usage')
  async getUsage(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('layoutId', ParseSlugIdPipe) layoutIdOrInternalId: string
  ): Promise<GetLayoutUsageResponseDto> {
    return this.getLayoutUsageUseCase.execute(
      GetLayoutUsageCommand.create({
        layoutIdOrInternalId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
      })
    );
  }
}

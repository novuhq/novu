import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ApiCommonResponses,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '../shared/framework/response.decorator';
import { IJwtPayload } from '@novu/shared';
import { GetLayoutCommand, GetLayoutUseCase, OtelSpan } from '@novu/application-generic';

import {
  CreateLayoutRequestDto,
  CreateLayoutResponseDto,
  FilterLayoutsRequestDto,
  FilterLayoutsResponseDto,
  GetLayoutResponseDto,
  UpdateLayoutRequestDto,
  UpdateLayoutResponseDto,
} from './dtos';
import {
  CreateLayoutCommand,
  CreateLayoutUseCase,
  DeleteLayoutCommand,
  DeleteLayoutUseCase,
  FilterLayoutsCommand,
  FilterLayoutsUseCase,
  SetDefaultLayoutCommand,
  SetDefaultLayoutUseCase,
  UpdateLayoutCommand,
  UpdateLayoutUseCase,
} from './usecases';
import { LayoutId } from './types';

import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';

@ApiCommonResponses()
@Controller('/layouts')
@ApiTags('Layouts')
@UseGuards(UserAuthGuard)
export class LayoutsController {
  constructor(
    private createLayoutUseCase: CreateLayoutUseCase,
    private deleteLayoutUseCase: DeleteLayoutUseCase,
    private filterLayoutsUseCase: FilterLayoutsUseCase,
    private getLayoutUseCase: GetLayoutUseCase,
    private setDefaultLayoutUseCase: SetDefaultLayoutUseCase,
    private updateLayoutUseCase: UpdateLayoutUseCase
  ) {}

  @Post('')
  @ExternalApiAccessible()
  @ApiResponse(CreateLayoutResponseDto, 201)
  @ApiOperation({ summary: 'Layout creation', description: 'Create a layout' })
  @OtelSpan()
  async createLayout(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateLayoutRequestDto
  ): Promise<CreateLayoutResponseDto> {
    Logger.verbose('Executing new layout command');

    const layout = await this.createLayoutUseCase.execute(
      CreateLayoutCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        name: body.name,
        identifier: body.identifier,
        description: body.description,
        content: body.content,
        variables: body.variables,
        isDefault: body.isDefault,
      })
    );

    Logger.verbose('Created new Layout' + layout._id);

    return {
      _id: layout._id,
    };
  }

  @Get('')
  @ExternalApiAccessible()
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Number of page for the pagination',
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    type: Number,
    description: 'Size of page for the pagination',
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    type: String,
    description: 'Sort field. Currently only supported `createdAt`',
    required: false,
  })
  @ApiQuery({
    name: 'orderBy',
    type: Number,
    description: 'Direction of the sorting query param. Either ascending (1) or descending (-1)',
    required: false,
  })
  @ApiOkResponse({
    type: FilterLayoutsResponseDto,
    description: 'The list of layouts that match the criteria of the query params are successfully returned.',
  })
  @ApiBadRequestResponse({
    description: 'Page size can not be larger than the page size limit.',
  })
  @ApiOperation({
    summary: 'Filter layouts',
    description:
      'Returns a list of layouts that can be paginated using the `page` query parameter and filtered by the environment where it is executed from the organization the user belongs to.',
  })
  async filterLayouts(
    @UserSession() user: IJwtPayload,
    @Query() query?: FilterLayoutsRequestDto
  ): Promise<FilterLayoutsResponseDto> {
    return await this.filterLayoutsUseCase.execute(
      FilterLayoutsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        page: query?.page,
        pageSize: query?.pageSize,
        sortBy: query?.sortBy,
        orderBy: query?.orderBy,
      })
    );
  }

  @Get('/:layoutId')
  @ExternalApiAccessible()
  @ApiResponse(GetLayoutResponseDto)
  @ApiNotFoundResponse({
    description: 'The layout with the layoutId provided does not exist in the database.',
  })
  @ApiOperation({ summary: 'Get layout', description: 'Get a layout by its ID' })
  async getLayout(
    @UserSession() user: IJwtPayload,
    @Param('layoutId') layoutId: LayoutId
  ): Promise<GetLayoutResponseDto> {
    return await this.getLayoutUseCase.execute(
      GetLayoutCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        layoutId,
      })
    );
  }

  @Delete('/:layoutId')
  @ExternalApiAccessible()
  @ApiNoContentResponse({
    description: 'The layout has been deleted correctly',
  })
  @ApiNotFoundResponse({
    description: 'The layout with the layoutId provided does not exist in the database so it can not be deleted.',
  })
  @ApiConflictResponse({
    description:
      'Either you are trying to delete a layout that is being used or a layout that is the default in the environment.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete layout', description: 'Execute a soft delete of a layout given a certain ID.' })
  async deleteLayout(@UserSession() user: IJwtPayload, @Param('layoutId') layoutId: LayoutId): Promise<void> {
    return await this.deleteLayoutUseCase.execute(
      DeleteLayoutCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        layoutId,
      })
    );
  }

  @Patch('/:layoutId')
  @ExternalApiAccessible()
  @ApiResponse(UpdateLayoutResponseDto)
  @ApiBadRequestResponse({
    description: 'The payload provided or the URL param are not right.',
  })
  @ApiNotFoundResponse({
    description: 'The layout with the layoutId provided does not exist in the database so it can not be updated.',
  })
  @ApiConflictResponse({
    description:
      'One default layout is needed. If you are trying to turn a default layout as not default, you should turn a different layout as default first and automatically it will be done by the system.',
    schema: { example: `One default layout is required` },
  })
  @ApiOperation({
    summary: 'Update a layout',
    description: 'Update the name, content and variables of a layout. Also change it to be default or no.',
  })
  async updateLayout(
    @UserSession() user: IJwtPayload,
    @Param('layoutId') layoutId: LayoutId,
    @Body() body: UpdateLayoutRequestDto
  ): Promise<UpdateLayoutResponseDto> {
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('Payload can not be empty');
    }

    return await this.updateLayoutUseCase.execute(
      UpdateLayoutCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        layoutId,
        name: body.name,
        identifier: body.identifier,
        description: body.description,
        content: body.content,
        variables: body.variables,
        isDefault: body.isDefault,
      })
    );
  }

  @Post('/:layoutId/default')
  @ExternalApiAccessible()
  @ApiNoContentResponse({
    description: 'The selected layout has been set as the default for the environment.',
  })
  @ApiNotFoundResponse({
    description:
      'The layout with the layoutId provided does not exist in the database so it can not be set as the default for the environment.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Set default layout',
    description:
      'Sets the default layout for the environment and updates to non default to the existing default layout (if any).',
  })
  async setDefaultLayout(@UserSession() user: IJwtPayload, @Param('layoutId') layoutId: LayoutId): Promise<void> {
    await this.setDefaultLayoutUseCase.execute(
      SetDefaultLayoutCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        layoutId,
      })
    );
  }
}

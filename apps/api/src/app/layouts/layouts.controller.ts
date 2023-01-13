import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';

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
  GetLayoutCommand,
  GetLayoutUseCase,
  UpdateLayoutCommand,
  UpdateLayoutUseCase,
} from './use-cases';
import { LayoutId } from './types';

import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { AnalyticsService } from '../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../shared/shared.module';

@Controller('/layouts')
@ApiTags('Layouts')
@UseGuards(JwtAuthGuard)
export class LayoutsController {
  constructor(
    private createLayoutUseCase: CreateLayoutUseCase,
    private deleteLayoutUseCase: DeleteLayoutUseCase,
    private filterLayoutsUseCase: FilterLayoutsUseCase,
    private getLayoutUseCase: GetLayoutUseCase,
    private updateLayoutUseCase: UpdateLayoutUseCase,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @Post('')
  @ExternalApiAccessible()
  @ApiCreatedResponse({
    type: CreateLayoutResponseDto,
  })
  @ApiOperation({ summary: 'Layout creation', description: 'Create a layout' })
  async createLayout(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateLayoutRequestDto
  ): Promise<CreateLayoutResponseDto> {
    const layout = await this.createLayoutUseCase.execute(
      CreateLayoutCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        name: body.name,
        description: body.description,
        content: body.content,
        variables: body.variables,
        isDefault: body.isDefault,
      })
    );

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
  @ApiOkResponse({
    type: FilterLayoutsResponseDto,
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
      })
    );
  }

  @Get('/:layoutId')
  @ExternalApiAccessible()
  @ApiOkResponse({
    type: GetLayoutResponseDto,
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
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete layout', description: 'Execute a soft delete of a layout given a certain ID.' })
  async deleteLayout(@UserSession() user: IJwtPayload, @Param('layoutId') layoutId: LayoutId): Promise<void> {
    return await this.deleteLayoutUseCase.execute(
      DeleteLayoutCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        layoutId,
      })
    );
  }

  @Patch('/:layoutId')
  @ExternalApiAccessible()
  @ApiOkResponse({
    type: UpdateLayoutResponseDto,
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
        layoutId,
        name: body.name,
        description: body.description,
        content: body.content,
        variables: body.variables,
        isDefault: body.isDefault,
      })
    );
  }
}

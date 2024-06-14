import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiBadRequestResponse,
  ApiCommonResponses,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { OrderByEnum, OrderDirectionEnum, UserSessionData } from '@novu/shared';
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
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkMethodName } from '../shared/framework/swagger/sdk.decorators';

@ApiCommonResponses()
@Controller('/layouts')
@ApiTags('Layouts')
@UserAuthentication()
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
  @SdkMethodName('create')
  async createLayout(
    @UserSession() user: UserSessionData,
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

  @Get()
  @ExternalApiAccessible()
  @ApiOkResponse({
    description: 'The list of layouts that match the criteria of the query params are successfully returned.',
  })
  @ApiBadRequestResponse({
    description: 'Page size can not be larger than the page size limit.',
  })
  @ApiOperation({
    summary: 'Filter layouts',
    description:
      'Returns a list of layouts that can be paginated using the `page` query parameter and filtered by' +
      ' the environment where it is executed from the organization the user belongs to.',
  })
  async listLayouts(
    @UserSession() user: UserSessionData,
    @Query() query?: FilterLayoutsRequestDto
  ): Promise<FilterLayoutsResponseDto> {
    return await this.filterLayoutsUseCase.execute(
      FilterLayoutsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        page: query?.page,
        pageSize: query?.pageSize,
        sortBy: query?.sortBy,
        orderBy: this.resolveOrderBy(query),
      })
    );
  }

  private resolveOrderBy(query?: FilterLayoutsRequestDto): OrderDirectionEnum {
    if (!query || !query.orderBy) {
      return OrderDirectionEnum.DESC;
    }
    if (query?.orderBy === OrderByEnum.ASC) {
      return OrderDirectionEnum.ASC;
    }
    if (query?.orderBy === OrderByEnum.DESC) {
      return OrderDirectionEnum.DESC;
    }
    if (query?.orderBy === OrderDirectionEnum.DESC) {
      return OrderDirectionEnum.DESC;
    }
    if (query?.orderBy === OrderDirectionEnum.ASC) {
      return OrderDirectionEnum.ASC;
    }

    return query?.orderBy;
  }

  @Get('/:layoutId')
  @ExternalApiAccessible()
  @ApiResponse(GetLayoutResponseDto)
  @ApiNotFoundResponse({
    description: 'The layout with the layoutId provided does not exist in the database.',
  })
  @ApiOperation({ summary: 'Get layout', description: 'Get a layout by its ID' })
  async getLayout(
    @UserSession() user: UserSessionData,
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
  async deleteLayout(@UserSession() user: UserSessionData, @Param('layoutId') layoutId: LayoutId): Promise<void> {
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
    @UserSession() user: UserSessionData,
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
  @SdkMethodName('setAsDefault')
  async setDefaultLayout(@UserSession() user: UserSessionData, @Param('layoutId') layoutId: LayoutId): Promise<void> {
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

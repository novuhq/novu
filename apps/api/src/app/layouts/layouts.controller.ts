import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';

import { CreateLayoutRequestDto, CreateLayoutResponseDto, GetLayoutResponseDto } from './dtos';
import { CreateLayoutCommand, CreateLayoutUseCase, GetLayoutCommand, GetLayoutUseCase } from './use-cases';
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
    private getLayoutUseCase: GetLayoutUseCase,
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
        name: body.name,
        organizationId: user.organizationId,
        userId: user._id,
        content: body.content,
        variables: body.variables,
        isDefault: body.isDefault,
      })
    );

    return {
      _id: layout._id,
    };
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
}

import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';

import { CreateLayoutRequestDto, CreateLayoutResponseDto } from './dtos';
import { CreateLayoutCommand, CreateLayoutUseCase } from './use-cases';

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
}

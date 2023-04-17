import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ChannelTypeEnum, IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { CalculateLimitNovuIntegration, CalculateLimitNovuIntegrationCommand } from '@novu/application-generic';

import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateIntegration } from './usecases/create-integration/create-integration.usecase';
import { CreateIntegrationRequestDto } from './dtos/create-integration-request.dto';
import { CreateIntegrationCommand } from './usecases/create-integration/create-integration.command';
import { GetIntegrations } from './usecases/get-integrations/get-integrations.usecase';
import { GetIntegrationsCommand } from './usecases/get-integrations/get-integrations.command';
import { Roles } from '../auth/framework/roles.decorator';
import { UpdateIntegrationRequestDto } from './dtos/update-integration.dto';
import { UpdateIntegration } from './usecases/update-integration/update-integration.usecase';
import { UpdateIntegrationCommand } from './usecases/update-integration/update-integration.command';
import { RemoveIntegrationCommand } from './usecases/remove-integration/remove-integration.command';
import { RemoveIntegration } from './usecases/remove-integration/remove-integration.usecase';
import { GetActiveIntegrations } from './usecases/get-active-integration/get-active-integration.usecase';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IntegrationResponseDto } from './dtos/integration-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetWebhookSupportStatus } from './usecases/get-webhook-support-status/get-webhook-support-status.usecase';
import { GetWebhookSupportStatusCommand } from './usecases/get-webhook-support-status/get-webhook-support-status.command';
import { GetInAppActivatedCommand } from './usecases/get-In-app-activated/get-In-app-activated.command';
import { GetInAppActivated } from './usecases/get-In-app-activated/get-In-app-activated.usecase';

@Controller('/integrations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Integrations')
export class IntegrationsController {
  constructor(
    private getInAppActivatedUsecase: GetInAppActivated,
    private getIntegrationsUsecase: GetIntegrations,
    private getActiveIntegrationsUsecase: GetActiveIntegrations,
    private getWebhookSupportStatusUsecase: GetWebhookSupportStatus,
    private createIntegrationUsecase: CreateIntegration,
    private updateIntegrationUsecase: UpdateIntegration,
    private removeIntegrationUsecase: RemoveIntegration,
    private calculateLimitNovuIntegration: CalculateLimitNovuIntegration
  ) {}

  @Get('/')
  @ApiOkResponse({
    type: [IntegrationResponseDto],
  })
  @ApiOperation({
    summary: 'Get integrations',
  })
  @ExternalApiAccessible()
  async getIntegrations(@UserSession() user: IJwtPayload): Promise<IntegrationResponseDto[]> {
    return await this.getIntegrationsUsecase.execute(
      GetIntegrationsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('/active')
  @ApiOkResponse({
    type: [IntegrationResponseDto],
  })
  @ApiOperation({
    summary: 'Get active integrations',
  })
  @ExternalApiAccessible()
  async getActiveIntegrations(@UserSession() user: IJwtPayload): Promise<IntegrationResponseDto[]> {
    return await this.getActiveIntegrationsUsecase.execute(
      GetIntegrationsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('/webhook/provider/:providerId/status')
  @ApiOperation({
    summary: 'Get webhook support status for provider',
  })
  @ExternalApiAccessible()
  async getWebhookSupportStatus(
    @UserSession() user: IJwtPayload,
    @Param('providerId') providerId: string
  ): Promise<boolean> {
    return await this.getWebhookSupportStatusUsecase.execute(
      GetWebhookSupportStatusCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        providerId: providerId,
        userId: user._id,
      })
    );
  }

  @Post('/')
  @ApiCreatedResponse({
    type: IntegrationResponseDto,
  })
  @ApiOperation({
    summary: 'Create integration',
  })
  @ExternalApiAccessible()
  async createIntegration(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateIntegrationRequestDto
  ): Promise<IntegrationResponseDto> {
    return await this.createIntegrationUsecase.execute(
      CreateIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        providerId: body.providerId,
        channel: body.channel,
        credentials: body.credentials,
        active: body.active,
        check: body.check,
      })
    );
  }

  @Put('/:integrationId')
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOkResponse({
    type: IntegrationResponseDto,
  })
  @ApiOperation({
    summary: 'Update integration',
  })
  @ExternalApiAccessible()
  updateIntegrationById(
    @UserSession() user: IJwtPayload,
    @Param('integrationId') integrationId: string,
    @Body() body: UpdateIntegrationRequestDto
  ): Promise<IntegrationResponseDto> {
    return this.updateIntegrationUsecase.execute(
      UpdateIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        integrationId,
        credentials: body.credentials,
        active: body.active,
        check: body.check,
      })
    );
  }

  @Delete('/:integrationId')
  @ApiOkResponse({
    type: [IntegrationResponseDto],
  })
  @ApiOperation({
    summary: 'Delete integration',
  })
  @ExternalApiAccessible()
  async removeIntegration(
    @UserSession() user: IJwtPayload,
    @Param('integrationId') integrationId: string
  ): Promise<IntegrationResponseDto[]> {
    return await this.removeIntegrationUsecase.execute(
      RemoveIntegrationCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        integrationId,
      })
    );
  }

  @Get('/:channelType/limit')
  async getProviderLimit(
    @UserSession() user: IJwtPayload,
    @Param('channelType') channelType: ChannelTypeEnum
  ): Promise<{ limit: number; count: number }> {
    const result = await this.calculateLimitNovuIntegration.execute(
      CalculateLimitNovuIntegrationCommand.create({
        channelType,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );

    if (!result) {
      return { limit: 0, count: 0 };
    }

    return result;
  }

  @Get('/in-app/status')
  async getInAppActivated(@UserSession() user: IJwtPayload) {
    return await this.getInAppActivatedUsecase.execute(
      GetInAppActivatedCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );
  }
}

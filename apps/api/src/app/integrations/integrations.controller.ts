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
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
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

@Controller('/integrations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Integrations')
export class IntegrationsController {
  constructor(
    private getIntegrationsUsecase: GetIntegrations,
    private getActiveIntegrationsUsecase: GetActiveIntegrations,
    private getWebhookSupportStatusUsecase: GetWebhookSupportStatus,
    private createIntegrationUsecase: CreateIntegration,
    private updateIntegrationUsecase: UpdateIntegration,
    private removeIntegrationUsecase: RemoveIntegration
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
      GetIntegrationsCommand.create({ environmentId: user.environmentId, organizationId: user.organizationId })
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
      GetIntegrationsCommand.create({ environmentId: user.environmentId, organizationId: user.organizationId })
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
}

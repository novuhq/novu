import { ClassSerializerInterceptor, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ProductFeature, RequirePermissions, UserSession } from '@novu/application-generic';
import { PermissionsEnum, ProductFeatureKeyEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { CreateWebhookPortalResponseDto } from './dtos/create-webhook-portal-response.dto';
import { GetWebhookPortalTokenResponseDto } from './dtos/get-webhook-portal-token-response.dto';
import { CreateWebhookPortalCommand } from './usecases/create-webhook-portal-token/create-webhook-portal.command';
import { CreateWebhookPortalUsecase } from './usecases/create-webhook-portal-token/create-webhook-portal.usecase';
import { GetWebhookPortalTokenCommand } from './usecases/get-webhook-portal-token/get-webhook-portal-token.command';
import { GetWebhookPortalTokenUsecase } from './usecases/get-webhook-portal-token/get-webhook-portal-token.usecase';

@Controller({ path: `/outbound-webhooks`, version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiExcludeController()
export class OutboundWebhooksController {
  constructor(
    private getWebhookPortalTokenUsecase: GetWebhookPortalTokenUsecase,
    private createWebhookPortalTokenUsecase: CreateWebhookPortalUsecase
  ) {}

  @Get('/portal/token')
  @ProductFeature(ProductFeatureKeyEnum.WEBHOOKS)
  @RequirePermissions(PermissionsEnum.WEBHOOK_WRITE, PermissionsEnum.WEBHOOK_READ)
  @ApiOperation({
    summary: 'Get Webhook Portal Access Token',
    description:
      'Generates a short-lived token and URL for accessing the Svix application portal for the current environment.',
  })
  async getPortalToken(@UserSession() user: UserSessionData): Promise<GetWebhookPortalTokenResponseDto> {
    return await this.getWebhookPortalTokenUsecase.execute(
      GetWebhookPortalTokenCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/portal/token')
  @ProductFeature(ProductFeatureKeyEnum.WEBHOOKS)
  @RequirePermissions(PermissionsEnum.WEBHOOK_WRITE)
  @ApiOperation({
    summary: 'Create Webhook Portal Access Token',
    description: 'Creates a token for accessing the webhook portal for the current environment.',
  })
  async createPortalToken(@UserSession() user: UserSessionData): Promise<CreateWebhookPortalResponseDto> {
    return await this.createWebhookPortalTokenUsecase.execute(
      CreateWebhookPortalCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}

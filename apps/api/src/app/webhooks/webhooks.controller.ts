import { ClassSerializerInterceptor, Controller, Get, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSession } from '@novu/application-generic';
import { ProductFeatureKeyEnum, UserSessionData } from '@novu/shared';
import { GetWebhookPortalTokenUsecase } from './usecases/get-webhook-portal-token/get-webhook-portal-token.usecase';
import { GetWebhookPortalTokenCommand } from './usecases/get-webhook-portal-token/get-webhook-portal-token.command';
import { GetWebhookPortalTokenResponseDto } from './dtos/get-webhook-portal-token-response.dto';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { CreateWebhookPortalUsecase } from './usecases/create-webhook-portal-token/create-webhook-portal.usecase';
import { CreateWebhookPortalCommand } from './usecases/create-webhook-portal-token/create-webhook-portal.command';
import { CreateWebhookPortalResponseDto } from './dtos/create-webhook-portal-token-response.dto';
import { ProductFeature } from '../shared/decorators/product-feature.decorator';

@Controller({ path: `/webhooks`, version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
export class WebhooksController {
  constructor(
    private getWebhookPortalTokenUsecase: GetWebhookPortalTokenUsecase,
    private createWebhookPortalTokenUsecase: CreateWebhookPortalUsecase
  ) {}

  @Get('/portal/token')
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

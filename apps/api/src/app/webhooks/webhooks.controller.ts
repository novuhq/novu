import { ClassSerializerInterceptor, Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { GetWebhookPortalTokenUsecase } from './usecases/get-webhook-portal-token/get-webhook-portal-token.usecase';
import { GetWebhookPortalTokenCommand } from './usecases/get-webhook-portal-token/get-webhook-portal-token.command';
import { GetWebhookPortalTokenResponseDto } from './dtos/get-webhook-portal-token-response.dto';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@Controller({ path: `/webhooks`, version: '1' })
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
export class WebhooksController {
  constructor(private getWebhookPortalTokenUsecase: GetWebhookPortalTokenUsecase) {}

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
}

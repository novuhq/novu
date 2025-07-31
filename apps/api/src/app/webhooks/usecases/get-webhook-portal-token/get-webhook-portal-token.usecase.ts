import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { generateWebhookAppId, LogDecorator, SvixClient } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { GetWebhookPortalTokenResponseDto } from '../../dtos/get-webhook-portal-token-response.dto';
import { GetWebhookPortalTokenCommand } from './get-webhook-portal-token.command';

@Injectable()
export class GetWebhookPortalTokenUsecase {
  constructor(
    private environmentRepository: EnvironmentRepository,
    @Inject('SVIX_CLIENT') private svix: SvixClient
  ) {}

  @LogDecorator()
  async execute(command: GetWebhookPortalTokenCommand): Promise<GetWebhookPortalTokenResponseDto> {
    if (!this.svix) {
      throw new BadRequestException('Webhook system is not enabled');
    }

    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!environment) {
      throw new NotFoundException(
        `Environment not found for id ${command.environmentId} and organization ${command.organizationId}`
      );
    }

    if (!environment.webhookAppId) {
      throw new NotFoundException(`Portal not found for environment ${command.environmentId}`);
    }

    try {
      const svixResponse = await this.svix.authentication.appPortalAccess(environment.webhookAppId, {});

      return {
        url: svixResponse.url,
        token: svixResponse.token,
        appId: environment.webhookAppId,
      };
    } catch (error) {
      if (error.code === 404) {
        throw new NotFoundException(`Portal not found for environment ${command.environmentId}`);
      }

      throw new BadRequestException(`Failed to generate Svix portal token: ${error?.message}`);
    }
  }
}

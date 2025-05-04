import { Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { LogDecorator } from '@novu/application-generic';
import { Svix } from 'svix'; // Import Svix SDK type

import { GetWebhookPortalTokenCommand } from './get-webhook-portal-token.command';
import { GetWebhookPortalTokenResponseDto } from '../../dtos/get-webhook-portal-token-response.dto';
import { CreateWebhookPortalUsecase } from '../create-webhook-portal-token/create-webhook-portal.usecase';
import { CreateWebhookPortalCommand } from '../create-webhook-portal-token/create-webhook-portal.command';

const LOG_CONTEXT = 'GetWebhookPortalTokenUsecase';

@Injectable()
export class GetWebhookPortalTokenUsecase {
  constructor(
    private environmentRepository: EnvironmentRepository,
    @Inject('SVIX_CLIENT') private svix: Svix,
    private createWebhookPortalUsecase: CreateWebhookPortalUsecase
  ) {}

  @LogDecorator()
  async execute(command: GetWebhookPortalTokenCommand): Promise<GetWebhookPortalTokenResponseDto> {
    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!environment) {
      throw new NotFoundException(
        `Environment not found for id ${command.environmentId} and organization ${command.organizationId}`
      );
    }

    try {
      // Call Svix SDK to get portal access URL and token
      const svixResponse = await this.svix.authentication.appPortalAccess(
        `${command.organizationId}-${command.environmentId}`,
        {}
      );

      return {
        url: svixResponse.url,
        token: svixResponse.token,
        appId: `${command.organizationId}-${command.environmentId}`,
      };
    } catch (error) {
      if (error.code === 404) {
        const app = await this.createWebhookPortalUsecase.execute(
          CreateWebhookPortalCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
          })
        );

        const svixResponse = await this.svix.authentication.appPortalAccess(app.appId, {});

        return {
          url: svixResponse.url,
          token: svixResponse.token,
          appId: app.appId,
        };
      }
      // Re-throw or handle specific Svix errors as needed
      throw new Error(`Failed to generate Svix portal token: ${error?.message}`);
    }
  }
}

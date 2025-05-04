import { Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { LogDecorator } from '@novu/application-generic';
import { Svix } from 'svix'; // Import Svix SDK type

import { GetWebhookPortalTokenCommand } from './get-webhook-portal-token.command';
import { GetWebhookPortalTokenResponseDto } from '../../dtos/get-webhook-portal-token-response.dto';

const LOG_CONTEXT = 'GetWebhookPortalTokenUsecase';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetWebhookPortalTokenUsecase {
  constructor(
    private environmentRepository: EnvironmentRepository,
    @Inject('SVIX_CLIENT') private svix: Svix
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

    // TODO: Refine how svixApplicationId is stored/retrieved if not in customData
    const svixApplicationId = environment.customData?.svixApplicationId as string;
    if (!svixApplicationId) {
      throw new NotFoundException(`Svix Application ID not configured for environment ${command.environmentId}.`);
    }

    try {
      Logger.log(`Generating Svix portal token for app ID: ${svixApplicationId}`, LOG_CONTEXT);

      // Call Svix SDK to get portal access URL and token
      const svixResponse = await this.svix.authentication.appPortalAccess(svixApplicationId);

      Logger.log(`Successfully generated Svix portal token for app ID: ${svixApplicationId}`, LOG_CONTEXT);

      return {
        url: svixResponse.url,
        token: svixResponse.token,
      };
    } catch (error) {
      Logger.error(
        `Failed to generate Svix portal token for app ID ${svixApplicationId}: ${error?.message}`,
        error?.stack,
        LOG_CONTEXT
      );

      // Re-throw or handle specific Svix errors as needed
      throw new Error(`Failed to generate Svix portal token: ${error?.message}`);
    }
  }
}

import { Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
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
    @Inject('SVIX_CLIENT') private svix: Svix,
    private organizationRepository: OrganizationRepository
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
      console.log('AAAAA', error.code);
      if (error.code === 404) {
        const organization = await this.organizationRepository.findById(command.organizationId);
        if (!organization) {
          throw new NotFoundException(`Organization not found for id ${command.organizationId}`);
        }

        const app = await this.svix.application.create({
          name: organization.name,
          uid: `${command.organizationId}-${command.environmentId}`,
          metadata: {
            environmentId: command.environmentId,
          },
        });

        const svixResponse = await this.svix.authentication.appPortalAccess(
          `${command.organizationId}-${command.environmentId}`,
          {}
        );

        console.log('APPsSSSs', svixResponse);

        return {
          url: svixResponse.url,
          token: svixResponse.token,
          appId: `${command.organizationId}-${command.environmentId}`,
        };
      }
      // Re-throw or handle specific Svix errors as needed
      throw new Error(`Failed to generate Svix portal token: ${error?.message}`);
    }
  }
}

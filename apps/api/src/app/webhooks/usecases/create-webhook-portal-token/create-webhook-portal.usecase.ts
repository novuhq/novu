import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { LogDecorator, generateWebhookAppId, SvixClient } from '@novu/application-generic';

import { CreateWebhookPortalCommand } from './create-webhook-portal.command';
import { CreateWebhookPortalResponseDto } from '../../dtos/create-webhook-portal-response.dto';

@Injectable()
export class CreateWebhookPortalUsecase {
  constructor(
    private environmentRepository: EnvironmentRepository,
    @Inject('SVIX_CLIENT') private svix: SvixClient,
    private organizationRepository: OrganizationRepository
  ) {}

  @LogDecorator()
  async execute(command: CreateWebhookPortalCommand): Promise<CreateWebhookPortalResponseDto> {
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

    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization not found for id ${command.organizationId}`);
    }

    try {
      const app = await this.svix.application.create({
        name: organization.name,
        uid: generateWebhookAppId(command.organizationId, command.environmentId),
        metadata: {
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        },
      });

      await this.environmentRepository.updateOne({ _id: command.environmentId }, { $set: { webhookAppId: app.uid } });

      return {
        appId: app.uid!,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate Svix portal token: ${error?.message}`);
    }
  }
}

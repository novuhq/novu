import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';

import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  MemberRepository,
} from '@novu/dal';

import { ProcessVercelWebhookCommand } from './process-vercel-webhook.command';
import { Sync } from '../../../bridge/usecases/sync';

@Injectable()
export class ProcessVercelWebhook {
  constructor(
    private organizationRepository: CommunityOrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private syncUsecase: Sync,
    private memberRepository: MemberRepository,
    private communityUserRepository: CommunityUserRepository
  ) {}

  async execute(command: ProcessVercelWebhookCommand) {
    const eventType = command.body.type;
    if (eventType !== 'deployment.succeeded') {
      Logger.log({ eventType }, `Skipping processing Vercel webhook event: ${eventType}`);

      return true;
    }

    const teamId = command.body.payload.team.id;
    const projectId = command.body.payload.project.id;
    const deploymentUrl = command.body.payload.deployment.url;
    const vercelEnvironment = command.body.payload.target || 'preview';

    Logger.log(
      {
        teamId,
        projectId,
        vercelEnvironment,
        deploymentUrl,
      },
      `Processing vercel webhook for ${vercelEnvironment}`
    );

    this.verifySignature(command.signatureHeader, command.body);

    const organizations = await this.organizationRepository.find(
      {
        'partnerConfigurations.teamId': teamId,
        'partnerConfigurations.projectIds': projectId,
      },
      { 'partnerConfigurations.$': 1 }
    );

    if (!organizations || organizations.length === 0) {
      Logger.error({ teamId, projectId }, 'Organization not found for vercel webhook integration');

      throw new BadRequestException('Organization not found');
    }

    for (const organization of organizations) {
      let environment: EnvironmentEntity | null;

      // TODO: we should think about how to handle different Vercel environments that are not production or development
      if (vercelEnvironment === 'production') {
        environment = await this.environmentRepository.findOne({
          _organizationId: organization._id,
          name: 'Production',
        });
      } else {
        environment = await this.environmentRepository.findOne({
          _organizationId: organization._id,
          name: 'Development',
        });
      }

      if (!environment) {
        throw new BadRequestException('Environment Not Found');
      }

      const orgAdmin = await this.memberRepository.getOrganizationAdminAccount(environment._organizationId);
      if (!orgAdmin) {
        throw new BadRequestException('Organization admin not found');
      }

      const internalUser = await this.communityUserRepository.findOne({ externalId: orgAdmin?._userId });

      if (!internalUser) {
        throw new BadRequestException('User not found');
      }

      await this.syncUsecase.execute({
        organizationId: environment._organizationId,
        userId: internalUser?._id as string,
        environmentId: environment._id,
        bridgeUrl: `https://${deploymentUrl}/api/novu`,
        source: 'vercel',
      });
    }

    return true;
  }

  private verifySignature(signature: string, body: any): void {
    const secret = process.env.VERCEL_CLIENT_SECRET;

    if (!signature || !secret) {
      throw new BadRequestException('Missing signature or secret');
    }

    const computedSignature = crypto.createHmac('sha1', secret).update(JSON.stringify(body)).digest('hex');

    if (signature !== computedSignature) {
      throw new BadRequestException('Invalid signature');
    }
  }
}

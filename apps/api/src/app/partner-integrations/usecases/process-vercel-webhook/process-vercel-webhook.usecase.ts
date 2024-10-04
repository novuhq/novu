import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';

import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  MemberRepository,
} from '@novu/dal';

import { ApiException } from '../../../shared/exceptions/api.exception';
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
    Logger.log(
      {
        teamId: command.teamId,
        projectId: command.projectId,
        vercelEnvironment: command.vercelEnvironment,
        deploymentUrl: command.deploymentUrl,
      },
      `Processing vercel webhook for ${command.vercelEnvironment}`
    );

    this.verifySignature(command.signatureHeader, command.body);

    const url = command.deploymentUrl;

    const organizations = await this.organizationRepository.find(
      {
        'partnerConfigurations.teamId': command.teamId,
        'partnerConfigurations.projectIds': command.projectId,
      },
      { 'partnerConfigurations.$': 1 }
    );

    const organization = organizations[0];

    if (!organization) {
      Logger.error(
        {
          teamId: command.teamId,
          projectId: command.projectId,
        },
        'Organization not found for vercel webhook integration'
      );

      throw new ApiException('Organization not found');
    }

    let environment: EnvironmentEntity | null;

    if (command.vercelEnvironment === 'production') {
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
      throw new ApiException('Environment Not Found');
    }

    const orgAdmin = await this.memberRepository.getOrganizationAdminAccount(environment._organizationId);
    if (!orgAdmin) {
      throw new ApiException('Organization admin not found');
    }

    const internalUser = await this.communityUserRepository.findOne({ externalId: orgAdmin?._userId });

    if (!internalUser) {
      throw new ApiException('User not found');
    }

    await this.syncUsecase.execute({
      organizationId: environment._organizationId,
      userId: internalUser?._id as string,
      environmentId: environment._id,
      bridgeUrl: `https://${url}/api/novu`,
      source: 'vercel',
    });

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

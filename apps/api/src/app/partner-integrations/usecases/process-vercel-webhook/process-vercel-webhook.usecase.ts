import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { ProcessVercelWebhookCommand } from './process-vercel-webhook.command';
import {
  OrganizationRepository,
  PartnerTypeEnum,
  IPartnerConfiguration,
  EnvironmentRepository,
  MemberRepository,
  EnvironmentEntity,
} from '@novu/dal';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class ProcessVercelWebhook {
  constructor(
    private httpService: HttpService,
    private organizationRepository: OrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    protected moduleRef: ModuleRef,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: ProcessVercelWebhookCommand) {
    const url = command.deploymentUrl;

    const organizations = await this.organizationRepository.find(
      {
        'partnerConfigurations.teamId': command.teamId,
        'partnerConfigurations.projectIds': command.projectId,
      },
      { 'partnerConfigurations.$': 1 }
    );

    const organization = organizations[0];

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

    if (!require('@novu/ee-bridge-api')?.Sync) {
      throw new ApiException('Bridge api module is not loaded');
    }
    const service = this.moduleRef.get(require('@novu/ee-bridge-api')?.Sync, { strict: false });
    const orgAdmin = await this.memberRepository.getOrganizationAdminAccount(environment._organizationId);

    const data = await service.execute({
      organizationId: environment._organizationId,
      userId: orgAdmin?._userId,
      environmentId: environment._id,
      bridgeUrl: 'https://' + url + '/api/novu',
      source: 'vercel',
    });

    return true;
  }
}

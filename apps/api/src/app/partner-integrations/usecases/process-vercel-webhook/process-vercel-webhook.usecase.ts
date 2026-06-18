import crypto from 'node:crypto';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  MemberRepository,
} from '@novu/dal';
import { lastValueFrom } from 'rxjs';
import { Sync } from '../../../bridge/usecases/sync';
import { areHexDigestsEqual } from '../../../shared/helpers/timing-safe-equal';
import { buildNovuBridgeUrl, resolveVercelProjectAlias } from '../../utils/vercel-bridge-url.util';
import { SyncAgentsFromBridgeCommand } from '../sync-agents-from-bridge/sync-agents-from-bridge.command';
import { SyncAgentsFromBridge } from '../sync-agents-from-bridge/sync-agents-from-bridge.usecase';
import { ProcessVercelWebhookCommand } from './process-vercel-webhook.command';

@Injectable()
export class ProcessVercelWebhook {
  constructor(
    private organizationRepository: CommunityOrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private syncUsecase: Sync,
    private syncAgentsFromBridge: SyncAgentsFromBridge,
    private httpService: HttpService,
    private memberRepository: MemberRepository,
    private communityUserRepository: CommunityUserRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ProcessVercelWebhookCommand) {
    const eventType = command.body.type;
    if (eventType !== 'deployment.succeeded') {
      this.logger.info(`Skipping processing Vercel webhook event: ${eventType}`);

      return true;
    }

    this.verifySignature(command.signatureHeader, command.body);

    const payload = command.body.payload;
    if (!payload?.team?.id || !payload?.project?.id || !payload?.deployment?.url) {
      throw new BadRequestException('Invalid webhook payload: missing required fields');
    }

    const teamId = payload.team.id;
    const projectId = payload.project.id;
    const deploymentUrl = payload.deployment.url;
    const vercelEnvironment = payload.target || 'preview';
    const isProduction = vercelEnvironment === 'production';

    this.logger.info(
      {
        teamId,
        projectId,
        vercelEnvironment,
        deploymentUrl,
      },
      `Processing vercel webhook for ${vercelEnvironment}`
    );

    const organizations = await this.organizationRepository.find(
      {
        'partnerConfigurations.teamId': teamId,
        'partnerConfigurations.projectIds': projectId,
      },
      { 'partnerConfigurations.$': 1 }
    );

    if (!organizations || organizations.length === 0) {
      throw new BadRequestException('Organization not found for vercel webhook integration');
    }

    for (const organization of organizations) {
      let environment: EnvironmentEntity | null;

      if (isProduction) {
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

      try {
        const orgOwner = await this.memberRepository.getOrganizationOwnerAccount(environment._organizationId);
        if (!orgOwner) {
          throw new BadRequestException('Organization owner not found');
        }

        const internalUser = await this.communityUserRepository.findOne({ externalId: orgOwner?._userId });

        if (!internalUser) {
          throw new BadRequestException('User not found');
        }

        const partnerConfiguration = organization.partnerConfigurations?.[0];
        const bridgeUrl = await this.resolveBridgeUrl({
          isProduction,
          environmentName: environment.name,
          projectId,
          teamId,
          deploymentUrl,
          accessToken: partnerConfiguration?.accessToken,
        });

        if (!bridgeUrl) {
          this.logger.warn(
            {
              organizationId: organization._id,
              projectId,
              vercelEnvironment,
            },
            'Skipping Vercel bridge registration because bridge URL could not be resolved'
          );

          continue;
        }

        await this.syncUsecase.execute({
          organizationId: environment._organizationId,
          userId: internalUser?._id as string,
          environmentId: environment._id,
          bridgeUrl,
          source: 'vercel',
        });

        await this.syncAgentsFromBridge.execute(
          SyncAgentsFromBridgeCommand.create({
            organizationId: environment._organizationId,
            userId: internalUser?._id as string,
            environmentId: environment._id,
            bridgeUrl,
            isProduction,
          })
        );
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }

        this.logger.error(
          {
            err: error,
            organizationId: organization._id,
            teamId,
            projectId,
          },
          'Failed to process Vercel webhook for organization'
        );

        throw new InternalServerErrorException(
          `Failed to process Vercel webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return true;
  }

  private async resolveBridgeUrl({
    isProduction,
    environmentName,
    projectId,
    teamId,
    deploymentUrl,
    accessToken,
  }: {
    isProduction: boolean;
    environmentName: string;
    projectId: string;
    teamId: string;
    deploymentUrl: string;
    accessToken?: string;
  }): Promise<string | undefined> {
    if (!isProduction) {
      return buildNovuBridgeUrl(deploymentUrl);
    }

    if (!accessToken) {
      return buildNovuBridgeUrl(deploymentUrl);
    }

    try {
      const getDomainsResponse = await lastValueFrom(
        this.httpService.get(`${process.env.VERCEL_BASE_URL}/v9/projects/${projectId}?teamId=${teamId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const alias = resolveVercelProjectAlias(getDomainsResponse.data?.targets, environmentName);

      if (!alias) {
        return buildNovuBridgeUrl(deploymentUrl);
      }

      return buildNovuBridgeUrl(alias);
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          projectId,
          teamId,
        },
        'Failed to resolve stable Vercel production alias; falling back to deployment URL'
      );

      return buildNovuBridgeUrl(deploymentUrl);
    }
  }

  private verifySignature(signature: string, body: any): void {
    const secret = process.env.VERCEL_CLIENT_SECRET;

    if (!signature || !secret) {
      throw new BadRequestException('Missing signature or secret');
    }

    const computedSignature = crypto.createHmac('sha1', secret).update(JSON.stringify(body)).digest('hex');

    if (!areHexDigestsEqual(computedSignature, signature)) {
      throw new BadRequestException('Invalid signature');
    }
  }
}

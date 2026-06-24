import crypto from 'node:crypto';
import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { areHexDigestsEqual } from '../../../shared/helpers/timing-safe-equal';
import { VercelBridgeSyncService } from '../../services/vercel-bridge-sync.service';
import { SyncVercelBridgeCommand } from '../sync-vercel-bridge/sync-vercel-bridge.command';
import { SyncVercelBridge } from '../sync-vercel-bridge/sync-vercel-bridge.usecase';
import { ProcessVercelWebhookCommand } from './process-vercel-webhook.command';

@Injectable()
export class ProcessVercelWebhook {
  constructor(
    private organizationRepository: CommunityOrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private syncVercelBridge: SyncVercelBridge,
    private vercelBridgeSyncService: VercelBridgeSyncService,
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
    if (!payload?.project?.id || !payload?.deployment?.url) {
      throw new BadRequestException('Invalid webhook payload: missing required fields');
    }

    const teamId = payload.team?.id ?? null;
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
        const partnerConfiguration = organization.partnerConfigurations?.[0];
        const bridgeUrl = await this.vercelBridgeSyncService.resolveBridgeUrl({
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

        const userId = await this.vercelBridgeSyncService.resolveSyncUserId(environment._organizationId);

        await this.syncVercelBridge.execute(
          SyncVercelBridgeCommand.create({
            organizationId: environment._organizationId,
            userId,
            environmentId: environment._id,
            bridgeUrl,
            isProduction,
          })
        );

        this.logger.info(
          {
            organizationId: organization._id,
            environmentId: environment._id,
            bridgeUrl,
            vercelEnvironment,
          },
          'Registered Vercel bridge from deployment webhook'
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

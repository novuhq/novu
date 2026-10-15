import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, CacheService, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import {
  ConnectClaimTokenCacheUnavailableError,
  ConnectClaimTokenService,
} from '../../../../connect/services/connect-claim-token.service';
import {
  CreateKeylessEnvironmentCommand,
  KeylessEnvironmentPurposeEnum,
} from '../../../../inbox/usecases/create-keyless-environment/create-keyless-environment.command';
import { CreateKeylessEnvironment } from '../../../../inbox/usecases/create-keyless-environment/create-keyless-environment.usecase';
import { agentEnvCreationError, KeylessAbuseGuardService } from '../../../keyless-abuse-guard.service';
import { writeKeylessAgentSource } from '../../../keyless-agent-cache';
import { resolveKeylessAgentClaimUrl } from '../../../keyless-agent-claim-url';
import {
  isKeylessAgentEnvironmentsSupported,
  KEYLESS_AGENT_DEFAULT_SOURCE,
  KeylessAgentAnalyticsEventEnum,
  KeylessAgentErrorCodeEnum,
  resolveKeylessAgentRetentionHours,
} from '../../../keyless-agent-environment';
import { CreateKeylessEnvironmentResponseDto } from '../../dtos';
import { ProvisionAgentKeylessEnvironmentCommand } from './provision-agent-keyless-environment.command';

const DEFAULT_API_URL = 'https://api.novu.co';
const DISABLED_MESSAGE = 'Keyless environments are not available on this deployment.';
@Injectable()
export class ProvisionAgentKeylessEnvironment {
  constructor(
    private featureFlagsService: FeatureFlagsService,
    private cacheService: CacheService,
    private keylessAbuseGuard: KeylessAbuseGuardService,
    private createKeylessEnvironment: CreateKeylessEnvironment,
    private connectClaimTokenService: ConnectClaimTokenService,
    private analyticsService: AnalyticsService,
    private communityOrganizationRepository: CommunityOrganizationRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ProvisionAgentKeylessEnvironmentCommand): Promise<CreateKeylessEnvironmentResponseDto> {
    await this.assertCreationEnabled();

    await this.keylessAbuseGuard.assertAgentEnvCreationAllowed(command.clientIp);

    const { environment, secretKey } = await this.createKeylessEnvironment.execute(
      CreateKeylessEnvironmentCommand.create({ purpose: KeylessEnvironmentPurposeEnum.AGENT })
    );

    const createdAt = new Date(environment.createdAt ?? Date.now()).toISOString();
    const { claimUrl, expiresAt } = await this.resolveClaimUrl(environment._id, environment._organizationId, createdAt);
    const source = command.source ?? KEYLESS_AGENT_DEFAULT_SOURCE;

    await writeKeylessAgentSource(
      this.cacheService,
      environment._id,
      source,
      resolveKeylessAgentRetentionHours() * 60 * 60
    );

    const analyticsPayload = {
      environmentId: environment._id,
      source,
      userAgent: command.userAgent,
      expiresAt,
      createdAt,
    };
    this.analyticsService.track(KeylessAgentAnalyticsEventEnum.CREATED, environment._id, analyticsPayload);
    this.analyticsService.mixpanelTrack(KeylessAgentAnalyticsEventEnum.CREATED, environment._id, analyticsPayload);

    this.logger.info({ environmentId: environment._id, source }, 'Keyless agent environment created');

    return {
      environmentId: environment._id,
      secretKey,
      applicationIdentifier: environment.identifier,
      apiUrl: resolveApiUrl(),
      claimUrl,
      expiresAt,
    };
  }

  private async assertCreationEnabled(): Promise<void> {
    const keylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;

    if (!isKeylessAgentEnvironmentsSupported() || !keylessOrganizationId) {
      throw disabledError();
    }

    const organization = await this.communityOrganizationRepository.findById(keylessOrganizationId);

    if (!organization) {
      throw disabledError();
    }

    const [isAgentEnvironmentsEnabled, isCreationEnabled] = await Promise.all([
      this.isFlagEnabled(FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_ENVIRONMENTS_ENABLED, organization),
      this.isFlagEnabled(FeatureFlagsKeysEnum.IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED, organization),
    ]);

    if (!isAgentEnvironmentsEnabled || !isCreationEnabled) {
      throw disabledError();
    }
  }

  private isFlagEnabled(key: FeatureFlagsKeysEnum, organization: OrganizationEntity): Promise<boolean> {
    return this.featureFlagsService.getFlag({ key, defaultValue: false, organization });
  }

  private async resolveClaimUrl(
    environmentId: string,
    organizationId: string,
    createdAt: string
  ): Promise<{ claimUrl: string; expiresAt: string }> {
    try {
      return await resolveKeylessAgentClaimUrl(this.connectClaimTokenService, {
        environmentId,
        organizationId,
        createdAt,
      });
    } catch (error) {
      if (error instanceof ConnectClaimTokenCacheUnavailableError) {
        this.logger.error({ environmentId, err: error }, 'Failed to issue keyless agent claim token');
        throw agentEnvCreationError(KeylessAgentErrorCodeEnum.UNAVAILABLE);
      }

      throw error;
    }
  }
}

function resolveApiUrl(): string {
  const apiRootUrl = process.env.API_ROOT_URL?.trim();

  return apiRootUrl ? apiRootUrl.replace(/\/+$/, '') : DEFAULT_API_URL;
}

function disabledError(): NotFoundException {
  return new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    message: DISABLED_MESSAGE,
    code: KeylessAgentErrorCodeEnum.DISABLED,
  });
}

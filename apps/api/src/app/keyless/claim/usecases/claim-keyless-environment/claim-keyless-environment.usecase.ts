import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalyticsService, CacheService, PinoLogger } from '@novu/application-generic';
import { EnvironmentEntity, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, UserSessionData } from '@novu/shared';
import { ClaimKeylessConnectCommand } from '../../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.command';
import {
  ClaimKeylessConnectBeforeMoveContext,
  ClaimKeylessConnectMoveOptions,
} from '../../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.types';
import {
  ClaimKeylessConnect,
  ClaimKeylessConnectResult,
} from '../../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.usecase';
import { readKeylessAgentSource, writeKeylessAgentClaimedTombstone } from '../../../keyless-agent-cache';
import {
  getKeylessAgentEnvironmentExpiresAt,
  isKeylessAgentEnvironment,
  isKeylessAgentEnvironmentExpired,
  KEYLESS_AGENT_DEFAULT_SOURCE,
  KeylessAgentAnalyticsEventEnum,
  KeylessAgentErrorCodeEnum,
} from '../../../keyless-agent-environment';
import { isKeylessOrganization } from '../../../keyless-organization.helpers';
import { KeylessWorkflowCopyScope } from '../copy-keyless-workflows/copy-keyless-workflows.command';
import { CopyKeylessWorkflows } from '../copy-keyless-workflows/copy-keyless-workflows.usecase';
import { ClaimKeylessEnvironmentCommand } from './claim-keyless-environment.command';

export type ClaimKeylessEnvironmentKind = 'agent-environment' | 'connect';

export interface ClaimKeylessEnvironmentResult {
  kind: ClaimKeylessEnvironmentKind;
  environmentId: string;
  agentIdentifier?: string;
  workflowIdentifiers: string[];
  skippedWorkflowIdentifiers: string[];
}

interface AgentEnvironmentClaim {
  keylessEnvironment: EnvironmentEntity;
  createdAt: string;
  scope: KeylessWorkflowCopyScope;
  copiedInternalIds: string[];
  copied: string[];
  skipped: string[];
  moveOptions: ClaimKeylessConnectMoveOptions;
}

const MINUTE_MS = 60 * 1000;

/**
 * Claims any keyless environment into the claimer's Development environment.
 * Connect environments go through `ClaimKeylessConnect` unchanged; agent environments also get their workflows
 * copied (before the move, so a clash leaves everything untouched) and their API keys revoked.
 */
@Injectable()
export class ClaimKeylessEnvironment {
  constructor(
    private readonly claimKeylessConnect: ClaimKeylessConnect,
    private readonly copyKeylessWorkflows: CopyKeylessWorkflows,
    private readonly integrationRepository: IntegrationRepository,
    private readonly cacheService: CacheService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ClaimKeylessEnvironmentCommand): Promise<ClaimKeylessEnvironmentResult> {
    const { user } = command;

    if (isKeylessOrganization(user.organizationId)) {
      throw new BadRequestException({
        message: 'Switch to your own organization to claim this environment.',
        code: KeylessAgentErrorCodeEnum.CLAIM_INTO_KEYLESS_ORG,
      });
    }

    let agentClaim: AgentEnvironmentClaim | undefined;
    let result: ClaimKeylessConnectResult;
    try {
      result = await this.claimKeylessConnect.execute(
        ClaimKeylessConnectCommand.create({
          token: command.token,
          organizationId: user.organizationId,
          userId: user._id,
        }),
        {
          beforeMove: async (context) => {
            if (!isKeylessAgentEnvironment(context.keylessEnvironment)) {
              return undefined;
            }

            agentClaim = await this.prepareAgentEnvironmentClaim(user, context);

            return agentClaim.moveOptions;
          },
        }
      );
    } catch (error) {
      if (agentClaim) {
        await this.copyKeylessWorkflows.compensate({
          user,
          targetEnvironmentId: agentClaim.scope.targetEnvironmentId,
          targetOrganizationId: agentClaim.scope.targetOrganizationId,
          copiedInternalIds: agentClaim.copiedInternalIds,
        });
      }

      throw error;
    }

    if (!agentClaim) {
      return {
        kind: 'connect',
        environmentId: result.environmentId,
        agentIdentifier: result.agentIdentifier,
        workflowIdentifiers: [],
        skippedWorkflowIdentifiers: [],
      };
    }

    await this.recordAgentEnvironmentClaim(user, agentClaim);

    return {
      kind: 'agent-environment',
      environmentId: result.environmentId,
      agentIdentifier: result.agentIdentifier,
      workflowIdentifiers: agentClaim.copied,
      skippedWorkflowIdentifiers: agentClaim.skipped,
    };
  }

  private async prepareAgentEnvironmentClaim(
    user: UserSessionData,
    { keylessEnvironment, targetEnvironment }: ClaimKeylessConnectBeforeMoveContext
  ): Promise<AgentEnvironmentClaim> {
    // Timestamps always set `createdAt`; a missing one is treated as expired rather than as never expiring.
    const createdAt = keylessEnvironment.createdAt ?? new Date(0).toISOString();
    if (isKeylessAgentEnvironmentExpired(createdAt)) {
      const expiresAt = getKeylessAgentEnvironmentExpiresAt(createdAt).toISOString();

      throw new BadRequestException({
        message: `This keyless environment expired on ${expiresAt}. Create a new one or sign up at https://dashboard.novu.co.`,
        code: KeylessAgentErrorCodeEnum.ENVIRONMENT_EXPIRED,
      });
    }

    const scope: KeylessWorkflowCopyScope = {
      sourceEnvironmentId: keylessEnvironment._id,
      sourceOrganizationId: keylessEnvironment._organizationId,
      targetEnvironmentId: targetEnvironment._id,
      targetOrganizationId: user.organizationId,
    };

    const preflight = await this.copyKeylessWorkflows.preflight(scope);
    const copy = await this.copyKeylessWorkflows.copy({ ...scope, user, workflowIds: preflight.toCopy });
    const targetNovuEmail = await this.integrationRepository.findOne(
      {
        _environmentId: scope.targetEnvironmentId,
        _organizationId: scope.targetOrganizationId,
        channel: ChannelTypeEnum.EMAIL,
        providerId: EmailProviderIdEnum.Novu,
      },
      '_id'
    );

    return {
      keylessEnvironment,
      createdAt,
      scope,
      copiedInternalIds: copy.copiedInternalIds,
      copied: copy.copied,
      skipped: [...preflight.skipped, ...copy.skipped],
      moveOptions: {
        excludeIntegrationProviderIds: targetNovuEmail ? [EmailProviderIdEnum.Novu] : [],
        revokeKeylessApiKeys: true,
      },
    };
  }

  /** Runs after the claim committed, so failures are logged and never fail the claim. */
  private async recordAgentEnvironmentClaim(user: UserSessionData, claim: AgentEnvironmentClaim): Promise<void> {
    const { keylessEnvironment, createdAt, scope } = claim;
    const now = new Date();

    for (const apiKey of keylessEnvironment.apiKeys ?? []) {
      if (!apiKey.hash) {
        continue;
      }

      await writeKeylessAgentClaimedTombstone(this.cacheService, apiKey.hash, {
        environmentId: keylessEnvironment._id,
        organizationId: keylessEnvironment._organizationId,
        claimedAt: now.toISOString(),
      });
    }

    try {
      const source =
        (await readKeylessAgentSource(this.cacheService, keylessEnvironment._id)) ?? KEYLESS_AGENT_DEFAULT_SOURCE;
      const event = {
        environmentId: keylessEnvironment._id,
        targetOrganizationId: scope.targetOrganizationId,
        targetEnvironmentId: scope.targetEnvironmentId,
        source,
        ageMinutes: Math.floor((now.getTime() - new Date(createdAt).getTime()) / MINUTE_MS),
        workflowsCopied: claim.copied.length,
        workflowsSkipped: claim.skipped.length,
      };

      this.analyticsService.track(KeylessAgentAnalyticsEventEnum.CLAIMED, keylessEnvironment._id, event);
      this.analyticsService.mixpanelTrack(KeylessAgentAnalyticsEventEnum.CLAIMED, keylessEnvironment._id, event);
      this.analyticsService.alias(keylessEnvironment._id, user._id);
    } catch (error) {
      this.logger.warn(
        { err: error, keylessEnvironmentId: keylessEnvironment._id },
        'Failed to record keyless agent environment claim analytics'
      );
    }
  }
}

import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
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
import { writeKeylessAgentClaimedTombstone } from '../../../keyless-agent-cache';
import {
  isKeylessAgentEnvironment,
  isKeylessAgentEnvironmentExpired,
  KeylessAgentErrorCodeEnum,
} from '../../../keyless-agent-environment';
import { createKeylessEnvironmentExpiredException } from '../../../keyless-agent-errors';
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
  scope: KeylessWorkflowCopyScope;
  copiedInternalIds: string[];
  copied: string[];
  skipped: string[];
  moveOptions: ClaimKeylessConnectMoveOptions;
}

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
    let moveCommitted = false;
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
          onMoveCommitted: () => {
            moveCommitted = true;
          },
        }
      );
    } catch (error) {
      // Once the move committed the copies belong to the claimed setup, so a later failure must not delete them.
      if (agentClaim && !moveCommitted) {
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

    await this.recordAgentEnvironmentClaim(agentClaim);

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
      throw createKeylessEnvironmentExpiredException(createdAt, HttpStatus.BAD_REQUEST);
    }

    const scope: KeylessWorkflowCopyScope = {
      sourceEnvironmentId: keylessEnvironment._id,
      sourceOrganizationId: keylessEnvironment._organizationId,
      targetEnvironmentId: targetEnvironment._id,
      targetOrganizationId: user.organizationId,
    };

    // Every read happens before the copy: nothing may fail between the copy and the move, or its copies would leak.
    const [preflight, targetNovuEmail] = await Promise.all([
      this.copyKeylessWorkflows.preflight(scope),
      this.integrationRepository.findOne(
        {
          _environmentId: scope.targetEnvironmentId,
          _organizationId: scope.targetOrganizationId,
          channel: ChannelTypeEnum.EMAIL,
          providerId: EmailProviderIdEnum.Novu,
        },
        '_id'
      ),
    ]);
    const copy = await this.copyKeylessWorkflows.copy({ ...scope, user, workflowIds: preflight.toCopy });
    const skipped = [...preflight.skipped, ...copy.skipped];

    return {
      keylessEnvironment,
      scope,
      copiedInternalIds: copy.copiedInternalIds,
      copied: copy.copied,
      skipped,
      moveOptions: {
        excludeIntegrationProviderIds: targetNovuEmail ? [EmailProviderIdEnum.Novu] : [],
        revokeKeylessApiKeys: true,
        claimedEventProperties: { workflowsCopied: copy.copied.length, workflowsSkipped: skipped.length },
      },
    };
  }

  /** Runs after the claim committed; tombstone writes are best-effort, so they never fail the claim. */
  private async recordAgentEnvironmentClaim(claim: AgentEnvironmentClaim): Promise<void> {
    const { keylessEnvironment } = claim;
    const claimedAt = new Date().toISOString();

    for (const apiKey of keylessEnvironment.apiKeys ?? []) {
      if (!apiKey.hash) {
        continue;
      }

      await writeKeylessAgentClaimedTombstone(this.cacheService, apiKey.hash, {
        environmentId: keylessEnvironment._id,
        organizationId: keylessEnvironment._organizationId,
        claimedAt,
      });
    }
  }
}

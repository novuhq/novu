import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { decryptCredentials, PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { Request as ExpressRequest } from 'express';
import { RemoveSlackWorkspaceInstallationCommand } from '../../channels/slack-uninstall/remove-slack-workspace-installation/remove-slack-workspace-installation.command';
import { RemoveSlackWorkspaceInstallation } from '../../channels/slack-uninstall/remove-slack-workspace-installation/remove-slack-workspace-installation.usecase';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { esmImport } from '../../shared/util/esm-import';
import { toWebRequest } from '../../shared/util/express-to-web-request';
import { resolveAgentPlatform } from '../../shared/util/provider-to-platform';

/** The part of `@chat-adapter/slack/webhook` used here (ESM-only, so loaded through `esmImport`). */
interface SlackWebhookModule {
  /** Checks the signature and request age, returns the raw body. */
  verifySlackRequest(request: Request, options: { signingSecret?: string }): Promise<string>;
  SlackWebhookVerificationError: new (...args: never[]) => Error;
}

interface SlackAppUninstalledPayload {
  team_id?: string;
  authorizations?: Array<{ team_id?: string | null; is_enterprise_install?: boolean }>;
}

/** Cheap check on the parsed body, before any lookup or signature check. */
export function isSlackAppUninstalledBody(body: unknown): boolean {
  const payload = body as { type?: unknown; event?: { type?: unknown } } | undefined;

  return payload?.type === 'event_callback' && payload.event?.type === 'app_uninstalled';
}

/**
 * Handles Slack `app_uninstalled` before the agent is resolved. The workspace is gone, so this
 * must not depend on what resolving needs: an active agent, a live agent link, or a bot token
 * that can still be refreshed. The integration's signing secret is enough to trust the event.
 */
@Injectable()
export class SlackAppUninstallIngress {
  constructor(
    private readonly logger: PinoLogger,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly removeSlackWorkspaceInstallation: RemoveSlackWorkspaceInstallation
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** Returns false when the target integration is not Slack, so the caller takes the normal webhook path. */
  async handle(agentId: string, integrationIdentifier: string, req: ExpressRequest): Promise<boolean> {
    const agent = await this.agentRepository.findByIdForWebhook(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }

    const integration = await this.integrationRepository.findOne({
      _environmentId: agent._environmentId,
      _organizationId: agent._organizationId,
      identifier: integrationIdentifier,
    });
    if (!integration) {
      throw new NotFoundException(`Integration ${integrationIdentifier} not found for agent ${agentId}`);
    }

    if (resolveAgentPlatform(integration.providerId) !== AgentPlatformEnum.SLACK) {
      return false;
    }

    const { signingSecret } = decryptCredentials(integration.credentials);
    const payload = await this.verify(req, signingSecret);
    const authorization = payload.authorizations?.[0];

    // An org-wide install is keyed by enterprise id, and Slack OAuth stores team ids only.
    if (authorization?.is_enterprise_install) {
      this.logger.info({ integrationIdentifier }, 'Ignoring Slack app uninstall for an Enterprise Grid org install');

      return true;
    }

    const workspaceId = authorization?.team_id || payload.team_id;
    if (!workspaceId) {
      this.logger.warn({ integrationIdentifier }, 'Ignoring Slack app uninstall without a team id');

      return true;
    }

    await this.removeSlackWorkspaceInstallation.execute(
      RemoveSlackWorkspaceInstallationCommand.create({
        environmentId: agent._environmentId,
        organizationId: agent._organizationId,
        integrationIdentifier,
        integrationId: integration._id,
        workspaceId,
      })
    );

    return true;
  }

  private async verify(req: ExpressRequest, signingSecret?: string): Promise<SlackAppUninstalledPayload> {
    const { verifySlackRequest, SlackWebhookVerificationError }: SlackWebhookModule =
      await esmImport('@chat-adapter/slack/webhook');

    let body: string;
    try {
      body = await verifySlackRequest(toWebRequest(req), { signingSecret });
    } catch (err) {
      if (err instanceof SlackWebhookVerificationError) {
        throw new UnauthorizedException('Invalid Slack request signature');
      }

      throw err;
    }

    return JSON.parse(body) as SlackAppUninstalledPayload;
  }
}

import { Injectable } from '@nestjs/common';
import { encryptSecret, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  EnvironmentRepository,
  IntegrationRepository,
  OrganizationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import { resolveAgentIntegrationForWebhook } from '../../shared/resolve-agent-integration-webhook.util';
import { ConfigurePhotonWebhookCommand } from '../configure-photon-webhook/configure-photon-webhook.command';
import { ConfigurePhotonWebhook } from '../configure-photon-webhook/configure-photon-webhook.usecase';
import {
  createPhotonProject,
  getPhotonProjectCredentials,
  isPhotonConnectEnabled,
  pollPhotonDeviceToken,
} from '../shared/photon-account-client';
import { PhotonDeviceAuthBindingService } from '../shared/photon-device-auth-binding.service';
import { PollPhotonDeviceAuthCommand } from './poll-photon-device-auth.command';

export interface PollPhotonDeviceAuthResult {
  status: 'pending' | 'slow_down' | 'complete' | 'expired' | 'denied' | 'error';
  /** Non-secret; shown in the setup guide on completion. */
  projectId?: string;
  /** Non-fatal setup caveats (Photon project-create warnings, webhook fallback). */
  warning?: string;
  error?: { code: string; message: string };
}

@Injectable()
export class PollPhotonDeviceAuth {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly configurePhotonWebhookUsecase: ConfigurePhotonWebhook,
    private readonly deviceAuthBindingService: PhotonDeviceAuthBindingService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: PollPhotonDeviceAuthCommand): Promise<PollPhotonDeviceAuthResult> {
    // Same kill switch as StartPhotonDeviceAuth: without this, a caller with a
    // device code obtained out-of-band could still drive provisioning (and
    // overwrite manually saved credentials) while connect is disabled.
    if (!isPhotonConnectEnabled()) {
      return {
        status: 'error',
        error: {
          code: 'connect_disabled',
          message: 'Photon connect is disabled — paste the Project ID and Project Secret manually.',
        },
      };
    }

    const { integration } = await resolveAgentIntegrationForWebhook({
      agentRepository: this.agentRepository,
      integrationRepository: this.integrationRepository,
      agentIntegrationRepository: this.agentIntegrationRepository,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      providerId: ChatProviderIdEnum.PhotonImessage,
      providerLabel: 'Photon',
    });

    /*
     * Only redeem codes this flow issued to this caller (StartPhotonDeviceAuth
     * stores the binding). Without this, a leaked device code from another
     * user's connect flow could be redeemed here and its Photon credentials
     * written onto this integration. One generic "start over" error for
     * expired, unknown, and foreign codes alike — never confirm a foreign
     * code exists.
     */
    const bindingCheck = await this.deviceAuthBindingService.checkBinding(command.deviceCode, {
      userId: command.userId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
    });

    if (bindingCheck !== 'valid') {
      return {
        status: 'error',
        error: {
          code: 'unknown_device_code',
          message: 'This connect session is no longer valid — click Connect to start over.',
        },
      };
    }

    /*
     * Serialize concurrent polls for one code (second browser tab, a slow
     * request outliving the poll interval): only the lock holder redeems and
     * provisions, so the flow cannot double-provision even if the token
     * endpoint tolerated a second exchange. Losers report pending — their next
     * tick lands after the winner released (or the lock self-expired).
     */
    const lockAcquired = await this.deviceAuthBindingService.acquirePollLock(command.deviceCode);
    if (!lockAcquired) {
      return { status: 'pending' };
    }

    try {
      return await this.redeemAndProvision(command, integration);
    } finally {
      await this.deviceAuthBindingService.releasePollLock(command.deviceCode);
    }
  }

  private async redeemAndProvision(
    command: PollPhotonDeviceAuthCommand,
    integration: { _id: string }
  ): Promise<PollPhotonDeviceAuthResult> {
    let poll: Awaited<ReturnType<typeof pollPhotonDeviceToken>>;
    try {
      poll = await pollPhotonDeviceToken(command.deviceCode);
    } catch (err) {
      this.logger.warn({ err }, 'Photon device token poll failed');

      /*
       * Transport failures (network blip, one 5xx, timeout) are not terminal:
       * the device authorization is still valid, so report pending and let the
       * dashboard keep polling — its loop is bounded by the flow's expiry.
       */
      return { status: 'pending' };
    }

    if (poll.status !== 'complete') {
      if (poll.status === 'denied' || poll.status === 'expired') {
        await this.deviceAuthBindingService.clearBinding(command.deviceCode);
      }

      return { status: poll.status };
    }

    // The code is consumed by the token exchange; the binding has done its job.
    await this.deviceAuthBindingService.clearBinding(command.deviceCode);

    /*
     * Authorized. Provision synchronously, then drop the access token — it is
     * never persisted and never reaches the browser. If provisioning fails the
     * device_code is already consumed, so the recovery is restarting connect.
     */
    try {
      const projectName = await this.buildProjectName(command);
      const { projectId, warning: createWarning } = await createPhotonProject(poll.accessToken, projectName);
      const credentials = await getPhotonProjectCredentials(poll.accessToken, projectId);

      await this.integrationRepository.update(
        {
          _id: integration._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: {
            'credentials.apiKey': encryptSecret(credentials.projectId),
            'credentials.secretKey': encryptSecret(credentials.projectSecret),
          },
        }
      );

      // Enables the iMessage platform, registers the inbound webhook, and
      // stores the Photon-issued signing secret — same path as the manual
      // "Configure webhook" button, so a failure here degrades to that step.
      const webhookResult = await this.configurePhotonWebhookUsecase.execute(
        ConfigurePhotonWebhookCommand.create({
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
        })
      );

      const warnings = [
        createWarning,
        webhookResult.success ? undefined : `Webhook setup incomplete: ${webhookResult.reason?.message}`,
      ].filter((entry): entry is string => Boolean(entry));

      return {
        status: 'complete',
        projectId,
        ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err, integrationId: integration._id }, 'Photon connect provisioning failed');

      return {
        status: 'error',
        error: {
          code: 'provisioning_failed',
          message: `Connection succeeded but provisioning failed (${message}) — click Connect to try again.`,
        },
      };
    }
  }

  private async buildProjectName(command: PollPhotonDeviceAuthCommand): Promise<string> {
    const [environment, organization] = await Promise.all([
      this.environmentRepository.findOne({ _id: command.environmentId }),
      this.organizationRepository.findById(command.organizationId),
    ]);

    const orgName = organization?.name?.trim() || 'Novu';
    const envName = environment?.name?.trim();

    return envName ? `Novu – ${orgName} (${envName})` : `Novu – ${orgName}`;
  }
}

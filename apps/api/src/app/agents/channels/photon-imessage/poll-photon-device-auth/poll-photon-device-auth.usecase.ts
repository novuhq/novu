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
  pollPhotonDeviceToken,
} from '../shared/photon-account-client';
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
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: PollPhotonDeviceAuthCommand): Promise<PollPhotonDeviceAuthResult> {
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

    let poll: Awaited<ReturnType<typeof pollPhotonDeviceToken>>;
    try {
      poll = await pollPhotonDeviceToken(command.deviceCode);
    } catch (err) {
      this.logger.warn({ err }, 'Photon device token poll failed');

      return {
        status: 'error',
        error: { code: 'photon_unreachable', message: 'Could not reach Photon — click Connect to start over.' },
      };
    }

    if (poll.status !== 'complete') {
      return { status: poll.status };
    }

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

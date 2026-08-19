import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import { resolveAgentIntegrationForWebhook } from '../../shared/resolve-agent-integration-webhook.util';
import { isPhotonConnectEnabled, startPhotonDeviceAuthorization } from '../shared/photon-account-client';
import { StartPhotonDeviceAuthCommand } from './start-photon-device-auth.command';

export interface StartPhotonDeviceAuthResult {
  available: boolean;
  reason?: string;
  userCode?: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  /**
   * Opaque device-flow handle the dashboard passes back on each poll. Useless
   * without the token endpoint plus an allow-listed client id, and the token
   * exchange itself only ever happens inside the Novu API (RFC 8628 treats
   * the device client as the holder of the device_code).
   */
  deviceCode?: string;
  interval?: number;
  expiresIn?: number;
}

@Injectable()
export class StartPhotonDeviceAuth {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: StartPhotonDeviceAuthCommand): Promise<StartPhotonDeviceAuthResult> {
    await resolveAgentIntegrationForWebhook({
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

    if (!isPhotonConnectEnabled()) {
      return {
        available: false,
        reason: 'Photon connect is disabled — paste the Project ID and Project Secret manually.',
      };
    }

    try {
      const authorization = await startPhotonDeviceAuthorization();

      return {
        available: true,
        userCode: authorization.userCode,
        verificationUri: authorization.verificationUri,
        verificationUriComplete: authorization.verificationUriComplete,
        deviceCode: authorization.deviceCode,
        interval: authorization.interval,
        expiresIn: authorization.expiresIn,
      };
    } catch (err) {
      this.logger.warn({ err }, 'Photon device authorization start failed');

      return {
        available: false,
        reason: 'Could not reach Photon to start the connect flow — paste the credentials manually.',
      };
    }
  }
}

import { Injectable } from '@nestjs/common';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  InvalidTelegramMobileTokenError,
  SlackAgentSetupLinkPayload,
  TelegramMobileLinkTokenService,
} from '../../telegram-linking/telegram-mobile-link-token.service';
import { GetSlackSetupLinkStatusCommand } from './get-slack-setup-link-status.command';

export type GetSlackSetupLinkStatusResult =
  | { valid: true; agentName: string; providerName: 'slack' }
  | { valid: false; reason: 'expired' | 'used' | 'invalid' };

@Injectable()
export class GetSlackSetupLinkStatus {
  constructor(
    private readonly tokenService: TelegramMobileLinkTokenService,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(command: GetSlackSetupLinkStatusCommand): Promise<GetSlackSetupLinkStatusResult> {
    let payload: SlackAgentSetupLinkPayload;
    try {
      payload = await this.tokenService.verifySlackAgentSetup(command.token);
    } catch (err) {
      if (err instanceof InvalidTelegramMobileTokenError) {
        return { valid: false, reason: err.reason };
      }

      throw err;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: payload.iid,
        _environmentId: payload.env,
        _organizationId: payload.org,
      },
      '_id providerId'
    );

    if (!integration || integration.providerId !== ChatProviderIdEnum.Slack) {
      return { valid: false, reason: 'invalid' };
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: payload.aid,
        _environmentId: payload.env,
        _organizationId: payload.org,
      },
      ['name']
    );

    if (!agent) {
      return { valid: false, reason: 'invalid' };
    }

    return { valid: true, agentName: agent.name, providerName: 'slack' };
  }
}

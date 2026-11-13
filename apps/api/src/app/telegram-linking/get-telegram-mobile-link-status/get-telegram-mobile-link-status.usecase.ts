import { Injectable } from '@nestjs/common';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import type { AgentLookDto } from '../../human/dtos/human-agent-look.dto';
import { AgentInboxFeaturesService } from '../../human/services/agent-inbox-features.service';
import { InvalidTelegramMobileTokenError, TelegramMobileLinkTokenService } from '../telegram-mobile-link-token.service';
import { GetTelegramMobileLinkStatusCommand } from './get-telegram-mobile-link-status.command';

export type GetTelegramMobileLinkStatusResult =
  | {
      valid: true;
      agentName: string;
      providerName: 'telegram';
      /** An Agent Inbox agent's look, for the mascot on its setup page. Missing while its mascots show the original. */
      agentLook?: AgentLookDto;
    }
  | { valid: false; reason: 'expired' | 'used' | 'invalid' };

@Injectable()
export class GetTelegramMobileLinkStatus {
  constructor(
    private readonly tokenService: TelegramMobileLinkTokenService,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentInboxFeatures: AgentInboxFeaturesService
  ) {}

  async execute(command: GetTelegramMobileLinkStatusCommand): Promise<GetTelegramMobileLinkStatusResult> {
    let payload: Awaited<ReturnType<TelegramMobileLinkTokenService['verify']>>;
    try {
      payload = await this.tokenService.verify(command.token);
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

    if (!integration || integration.providerId !== ChatProviderIdEnum.Telegram) {
      return { valid: false, reason: 'invalid' };
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: payload.aid,
        _environmentId: payload.env,
        _organizationId: payload.org,
      },
      ['name', 'runtime', 'look', '_organizationId']
    );

    if (!agent) {
      return { valid: false, reason: 'invalid' };
    }

    const agentLook = agent.runtime === 'human_relay' ? await this.agentInboxFeatures.mascotLookOf(agent) : null;

    return { valid: true, agentName: agent.name, providerName: 'telegram', ...(agentLook ? { agentLook } : {}) };
  }
}

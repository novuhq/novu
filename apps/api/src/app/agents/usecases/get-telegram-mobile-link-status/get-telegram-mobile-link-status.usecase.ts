import { Injectable } from '@nestjs/common';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  InvalidTelegramMobileTokenError,
  TelegramMobileLinkTokenService,
} from '../../services/telegram-mobile-link-token.service';
import { GetTelegramMobileLinkStatusCommand } from './get-telegram-mobile-link-status.command';

export type GetTelegramMobileLinkStatusResult =
  | { valid: true; agentName: string; providerName: 'telegram' }
  | { valid: false; reason: 'expired' | 'used' | 'invalid' };

@Injectable()
export class GetTelegramMobileLinkStatus {
  constructor(
    private readonly tokenService: TelegramMobileLinkTokenService,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(command: GetTelegramMobileLinkStatusCommand): Promise<GetTelegramMobileLinkStatusResult> {
    let payload: ReturnType<TelegramMobileLinkTokenService['verify']>;
    try {
      payload = this.tokenService.verify(command.token);
    } catch (err) {
      if (err instanceof InvalidTelegramMobileTokenError) {
        return { valid: false, reason: err.reason };
      }
      return { valid: false, reason: 'invalid' };
    }

    if (await this.tokenService.isJtiUsed(payload.jti)) {
      return { valid: false, reason: 'used' };
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
      ['name']
    );

    if (!agent) {
      return { valid: false, reason: 'invalid' };
    }

    return { valid: true, agentName: agent.name, providerName: 'telegram' };
  }
}

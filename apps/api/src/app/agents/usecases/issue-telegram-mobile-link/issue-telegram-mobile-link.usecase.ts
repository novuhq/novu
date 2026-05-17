import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import { TelegramMobileLinkTokenService } from '../../services/telegram-mobile-link-token.service';
import { IssueTelegramMobileLinkCommand } from './issue-telegram-mobile-link.command';

export interface IssueTelegramMobileLinkResult {
  token: string;
  /** Absolute URL the user can open on a mobile device to complete setup. */
  url: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
}

const MOBILE_PATH = '/agents/telegram/connect';

@Injectable()
export class IssueTelegramMobileLink {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly tokenService: TelegramMobileLinkTokenService
  ) {}

  async execute(command: IssueTelegramMobileLinkCommand): Promise<IssueTelegramMobileLinkResult> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'identifier']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id providerId'
    );

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationId} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.Telegram) {
      throw new BadRequestException('Mobile setup link is only available for Telegram integrations.');
    }

    const link = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agent._id,
        _integrationId: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!link) {
      throw new NotFoundException('Integration is not linked to this agent');
    }

    const { token, expiresAt } = await this.tokenService.issue({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: agent.identifier,
      integrationId: integration._id,
    });

    return {
      token,
      expiresAt,
      url: this.buildMobileUrl(token),
    };
  }

  private buildMobileUrl(token: string): string {
    const base = (process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL || 'https://dashboard.novu.co').replace(
      /\/$/,
      ''
    );

    return `${base}${MOBILE_PATH}/${token}`;
  }
}
